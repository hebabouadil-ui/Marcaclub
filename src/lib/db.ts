import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || ''

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined
}

const cached: MongooseCache = global.mongoose ?? { conn: null, promise: null }
global.mongoose = cached

export async function connectDB() {
  if (!MONGODB_URI) throw new Error('MONGODB_URI is not defined')
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false }).catch((err) => {
      cached.promise = null
      throw err
    })
  }

  cached.conn = await cached.promise
  return cached.conn
}
