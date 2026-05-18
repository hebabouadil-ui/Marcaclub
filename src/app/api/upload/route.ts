import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ message: 'No file provided' }, { status: 400 })

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ message: 'Type de fichier non supporté. Utilisez JPEG, PNG ou WEBP.' }, { status: 400 })
    }
    const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ message: 'Fichier trop volumineux (max 10 Mo)' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`

    const result = await cloudinary.uploader.upload(base64, {
      folder: 'marcaclub/products',
      transformation: [{ width: 1500, height: 2000, crop: 'limit', quality: 'auto:best' }],
    })

    return NextResponse.json({ url: result.secure_url, publicId: result.public_id })
  } catch (err: unknown) {
    console.error('Upload error:', err)
    const message = err instanceof Error
      ? err.message
      : typeof (err as { message?: string }).message === 'string'
        ? (err as { message: string }).message
        : JSON.stringify(err)
    return NextResponse.json({ message }, { status: 500 })
  }
}
