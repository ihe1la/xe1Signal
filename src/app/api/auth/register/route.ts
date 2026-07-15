import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { registrationRequestSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = registrationRequestSchema.parse(body);
    const { name, username, email, password } = validatedData;

    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [...(email ? [{ email }] : []), { username }],
      },
    });

    if (existingUser) {
      if (email && existingUser.email === email) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: "This username is already taken" },
        { status: 400 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create the account and defaults atomically so a partial registration
    // cannot leave the user without their settings or archive structure.
    const defaultFrequencies = [
      {
        name: "Late-night thoughts",
        description: "Thoughts that arrive at 3AM",
      },
      { name: "Web weirdness", description: "Strange corners of the internet" },
      { name: "Beautiful interfaces", description: "UI that makes you pause" },
      { name: "Songs that hurt", description: "Tracks with emotional weight" },
      { name: "Read later", description: "Articles and links to revisit" },
    ];

    const user = await db.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          name,
          username,
          email,
          passwordHash: hashedPassword,
          role: "USER",
          emailVerified: null,
        },
      });

      await transaction.frequency.createMany({
        data: defaultFrequencies.map((frequency) => ({
          ...frequency,
          ownerId: createdUser.id,
          visibility: "PRIVATE",
          tags: "",
        })),
      });

      await transaction.userSettings.create({
        data: {
          userId: createdUser.id,
          theme: "dark",
          emailNotifications: true,
          pushNotifications: true,
        },
      });

      return createdUser;
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 },
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
