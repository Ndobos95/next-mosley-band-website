import { auth } from "@/lib/auth"

console.log('📡 Better-auth API route loaded')

export async function GET(request: Request) {
  return auth.handler(request)
}

export async function POST(request: Request) {
  return auth.handler(request)
}