import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "./prisma"
import { Resend } from "resend"

console.log('🚀 Initializing better-auth...')

const resend = new Resend(process.env.RESEND_API_KEY)

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  database: prismaAdapter(prisma, {
    provider: "sqlite"
  }),
  
  logger: {
    level: "debug"
  },
  
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Temporarily disable to test basic auth
    sendEmailVerification: async (user: { email: string }, url: string) => {
      // Send verification email via Resend
      await resend.emails.send({
        from: process.env.FROM_EMAIL || "noreply@localhost",
        to: user.email,
        subject: "Verify your email address",
        html: `
          <h1>Welcome to the Band Program!</h1>
          <p>Please click the link below to verify your email address:</p>
          <a href="${url}">Verify Email</a>
          <p>If you didn't create an account, you can safely ignore this email.</p>
        `
      })
    }
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || ""
    }
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24 // 1 day
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "PARENT",
        validation: (value: string) => {
          return value === "PARENT" || value === "DIRECTOR"
        }
      }
    }
  }
})

console.log('✅ Better-auth initialized successfully')