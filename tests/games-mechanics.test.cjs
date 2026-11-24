const {test}=require('node:test'),assert=require('node:assert/strict');
const mechanics=import('../assets/games.mjs');
test('match-3 detects horizontal and vertical unions without duplicate scoring',async()=>{
 const {findMatches}=await mechanics;assert.deepEqual(findMatches([0,0,0,0,1,2,0,2,1],3).sort(),[0,1,2,3,6]);
 assert.deepEqual(findMatches([0,1,2,1,2,0,2,0,1],3),[]);
});
test('match-3 rejects row wrap, diagonal, out of range and non-matching swaps',async()=>{
 const {swapMatch}=await mechanics,b=[0,1,0,2,0,1,1,2,2];
 for(const pair of [[2,3],[0,4],[-1,0],[0,9],[0,0],[1,2]])assert.equal(swapMatch(b,...pair,3),null);
});
test('match-3 valid adjacent swap returns a new board and preserves original',async()=>{
 const {swapMatch,findMatches}=await mechanics,b=[0,1,0,2,0,1,1,2,2],before=[...b];
 const result=swapMatch(b,1,4,3);assert.deepEqual(b,before);assert.deepEqual(findMatches(result,3).sort(),[0,1,2]);
});
