import { createClerkClient } from '@clerk/backend';
import * as dotenv from 'dotenv';
dotenv.config();

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function run() {
  try {
    const user = await clerkClient.users.createUser({
      firstName: "admin1",
      lastName: "admin1",
      username: "admink2",
      password: "ad@mink123",
      publicMetadata: {
        role: "CASHIER",
      },
    });
    console.log("Success:", user);
  } catch (error: any) {
    console.error("Error status:", error.status);
    console.error("Error statusCode:", error.statusCode);
    console.error("Error message:", error.message);
    console.error("Full error:", JSON.stringify(error, null, 2));
  }
}

run();
