"""Response headers shared by the local preview and existing analytics service.

Response headers do not buffer files or observe/increment download counters.
Only analytics collector POST bodies are buffered within a strict byte limit
before JSON parsing. Trusted inline hashes use constant dashboard markup only.
"""
import base64
import hashlib
from html.parser import HTMLParser


def _hash_source(content):
    digest = hashlib.sha256(content.encode('utf-8')).digest()
    return "'sha256-" + base64.b64encode(digest).decode('ascii') + "'"


class _TrustedInlineBlocks(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.scripts = set()
        self.styles = set()
        self.tag = None
        self.content = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        executable = attributes.get('type', '').lower() in (
            '', 'text/javascript', 'application/javascript', 'module')
        if tag == 'style' or (tag == 'script' and 'src' not in attributes and executable):
            self.tag = tag
            self.content = []

    def handle_data(self, data):
        if self.tag:
            self.content.append(data)

    def handle_endtag(self, tag):
        if self.tag == tag:
            target = self.scripts if tag == 'script' else self.styles
            target.add(_hash_source(''.join(self.content)))
            self.tag = None
            self.content = []


def content_security_policy(trusted_markup=''):
    """Hash only explicitly configured constant HTML, never response/request data."""
    inline = _TrustedInlineBlocks()
    inline.feed(trusted_markup)
    script_sources = ' '.join(["'self'", *sorted(inline.scripts)])
    style_sources = ' '.join(["'self'", *sorted(inline.styles)])
    # The generated SVG has six literal style="display:none" attributes.
    # Motion uses trusted external JS/CSSOM setters, not arbitrary style strings.
    attribute_style = "'unsafe-hashes' " + _hash_source('display:none')
    return '; '.join((
        "default-src 'none'", f'script-src {script_sources}',
        "script-src-attr 'none'", f'style-src {style_sources}',
        f'style-src-attr {attribute_style}', "img-src 'self'", "font-src 'self'",
        "connect-src 'self'", "manifest-src 'self'", "media-src 'none'",
        "worker-src 'none'", "frame-src 'none'", "object-src 'none'",
        "base-uri 'none'", "frame-ancestors 'none'", "form-action 'self'",
    ))


class SecurityHeadersMiddleware:
    ANALYTICS_BODY_LIMIT = 8192

    def __init__(self, app, trusted_inline_pages=None):
        self.app = app
        self.policy = content_security_policy().encode('ascii')
        self.page_policies = {
            path: content_security_policy(markup).encode('ascii')
            for path, markup in (trusted_inline_pages or {}).items()
        }
        self.headers = (
            (b'x-content-type-options', b'nosniff'),
            (b'x-frame-options', b'DENY'),
            (b'referrer-policy', b'no-referrer'),
            (b'permissions-policy', b'camera=(), microphone=(), geolocation=(), payment=(), usb=()'),
        )
        self.controlled = {name for name, _ in self.headers} | {b'content-security-policy'}

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            return await self.app(scope, receive, send)

        async def secured_send(message):
            if message['type'] == 'http.response.start':
                # Replace conflicting copies; preserve content/range/cache headers.
                headers = [(key, value) for key, value in message.get('headers', [])
                           if key.lower() not in self.controlled]
                headers.extend(self.headers)
                headers.append((b'content-security-policy',
                                self.page_policies.get(scope.get('path'), self.policy)))
                message = {**message, 'headers': headers}
            await send(message)

        if scope.get('path') == '/_analytics/event' and scope.get('method') == 'POST':
            # Bound bytes before FastAPI's JSON parser, including chunked bodies
            # and clients that omit or understate Content-Length. Never log them.
            async def reject_large_body():
                body = b'{"detail":"Analytics payload exceeds 8192 bytes."}'
                await secured_send({'type': 'http.response.start', 'status': 413, 'headers': [
                    (b'content-type', b'application/json'),
                    (b'content-length', str(len(body)).encode('ascii')),
                    (b'cache-control', b'no-store'),
                ]})
                await secured_send({'type': 'http.response.body', 'body': body})

            for key, value in scope.get('headers', []):
                if key.lower() == b'content-length':
                    try:
                        if int(value) > self.ANALYTICS_BODY_LIMIT:
                            return await reject_large_body()
                    except ValueError:
                        # The HTTP server validates malformed length headers;
                        # the actual streamed byte limit remains authoritative.
                        pass
            bounded_body = bytearray()
            while True:
                message = await receive()
                if message['type'] == 'http.disconnect':
                    return
                chunk = message.get('body', b'')
                if len(bounded_body) + len(chunk) > self.ANALYTICS_BODY_LIMIT:
                    return await reject_large_body()
                bounded_body.extend(chunk)
                if not message.get('more_body', False):
                    break
            replayed = False

            async def bounded_receive():
                nonlocal replayed
                if not replayed:
                    replayed = True
                    return {'type': 'http.request', 'body': bytes(bounded_body), 'more_body': False}
                return await receive()

            return await self.app(scope, bounded_receive, secured_send)

        await self.app(scope, receive, secured_send)
