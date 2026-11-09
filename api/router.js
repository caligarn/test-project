// Vercel serverless entry. vercel.json rewrites every /api/* path here.
import { handleApi } from '../server/routes.js'

export default function handler(req, res) {
  return handleApi(req, res)
}
