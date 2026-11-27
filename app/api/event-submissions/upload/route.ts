import { chunkedImage } from "../../../../lib/chunked-image";
export async function POST(request: Request) {
  return chunkedImage(request, "event-submissions", 10 * 1024 * 1024);
}
