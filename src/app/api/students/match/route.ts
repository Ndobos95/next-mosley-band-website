import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fuzzyMatch } from '@/lib/fuzzy-match'

export async function POST(request: NextRequest) {
  try {
    const { studentName } = await request.json()
    
    if (!studentName || studentName.length < 3) {
      return NextResponse.json({
        found: false,
        message: "Please enter at least 3 characters"
      })
    }
    
    const students = await prisma.student.findMany({
      where: {
        source: {
          in: ['ROSTER', 'MANUAL']
        }
      },
      select: {
        id: true,
        name: true,
        instrument: true
      }
    })
    
    // Find best match using fuzzy matching
    let bestMatch = null
    let bestScore = 0
    
    for (const student of students) {
      const score = fuzzyMatch(studentName, student.name)
      if (score > bestScore) {
        bestScore = score
        bestMatch = student
      }
    }
    
    // Consider a match if score is above threshold
    const threshold = 0.8
    if (bestMatch && bestScore >= threshold) {
      return NextResponse.json({
        found: true,
        message: `✓ Match found: ${bestMatch.name} (${bestMatch.instrument})`,
        student: bestMatch,
        confidence: bestScore
      })
    } else if (bestMatch && bestScore >= 0.5) {
      return NextResponse.json({
        found: false,
        message: `⚠️ Possible match: ${bestMatch.name}. Please verify spelling or contact band director.`,
        student: bestMatch,
        confidence: bestScore
      })
    } else {
      return NextResponse.json({
        found: false,
        message: "⚠️ No matching student found. Payment will require manual verification.",
        confidence: 0
      })
    }
  } catch (error) {
    console.error('Student matching error:', error)
    return NextResponse.json(
      { error: 'Failed to match student' },
      { status: 500 }
    )
  }
}