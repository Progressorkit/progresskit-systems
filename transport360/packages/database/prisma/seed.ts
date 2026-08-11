import { PrismaClient, Role, OrderType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Users
  const passenger = await prisma.user.create({
    data: {
      email: 'anna.passenger@example.com',
      password: 'pass123',
      role: Role.PASSENGER,
    },
  });

  const dispatcher = await prisma.user.create({
    data: {
      email: 'marek.dispatcher@example.com',
      password: 'dispatch123',
      role: Role.DISPATCHER,
    },
  });

  const driver = await prisma.user.create({
    data: {
      email: 'jan.driver@example.com',
      password: 'driver123',
      role: Role.DRIVER,
    },
  });

  // Carrier & Vehicle
  const carrier = await prisma.carrier.create({
    data: {
      name: 'EuroTrans Logistics',
      vehicles: {
        create: [
          {
            plate: 'B-ET-1234',
            capacity: 1200,
          },
        ],
      },
    },
    include: { vehicles: true },
  });

  const vehicle = carrier.vehicles[0];

  // Orders
  // Berlin -> Warsaw (Passenger B2C)
  const order1 = await prisma.order.create({
    data: {
      type: OrderType.B2C,
      title: 'Berlin → Warszawa - Passenger booking',
      passengerId: passenger.id,
      originLat: 52.52,
      originLng: 13.405,
      destLat: 52.2297,
      destLng: 21.0122,
    },
  });

  // Hamburg -> Poznań (Cargo B2B)
  const order2 = await prisma.order.create({
    data: {
      type: OrderType.B2B,
      title: 'Hamburg → Poznań - Cargo load',
      carrierId: carrier.id,
      originLat: 53.5511,
      originLng: 9.9937,
      destLat: 52.4064,
      destLng: 16.9252,
    },
  });

  // Trip with driver, vehicle and stops (Berlin -> Warsaw)
  const trip = await prisma.trip.create({
    data: {
      driverId: driver.id,
      vehicleId: vehicle.id,
      startAt: new Date(),
      stops: {
        create: [
          { seq: 1, lat: 52.52, lng: 13.405 }, // Berlin origin
          { seq: 2, lat: 52.4064, lng: 16.9252 }, // Poznan (pass-by)
          { seq: 3, lat: 52.2297, lng: 21.0122 }, // Warsaw dest
        ],
      },
    },
    include: { stops: true },
  });

  console.log('Seed data created:');
  console.log({ passenger: passenger.email, dispatcher: dispatcher.email, driver: driver.email });
  console.log({ carrier: carrier.name, vehicle: vehicle.plate });
  console.log({ orders: [order1.id, order2.id], trip: trip.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
