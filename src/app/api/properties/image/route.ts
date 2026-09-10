import { NextRequest, NextResponse } from "next/server";
import { put, del, get } from "@vercel/blob";
import { getAuthDb } from "@/lib/apiAuth";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

function missingTokenResponse() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Photo storage isn't configured yet (missing BLOB_READ_WRITE_TOKEN). Add it in Vercel project settings, then try again.",
    },
    { status: 503 }
  );
}

// The Blob store backing this app is private, so uploaded photos can't be
// served from a public URL. We store the blob pathname on the property doc
// and stream it back through the GET handler below (which checks the
// requesting user owns the property) instead.
export async function POST(req: NextRequest) {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;

  if (!process.env.BLOB_READ_WRITE_TOKEN) return missingTokenResponse();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const propertyId = formData.get("propertyId") as string | null;

  if (!file || !propertyId) {
    return NextResponse.json({ ok: false, error: "A photo and propertyId are required" }, { status: 400 });
  }

  if (!file.type || !file.type.startsWith("image/")) {
    return NextResponse.json({ ok: false, error: "Please choose an image file (JPG, PNG, HEIC, etc.)" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ ok: false, error: "Image is too large — please choose a photo under 10MB" }, { status: 400 });
  }

  try {
    const property = await db.collection("properties").findOne({ id: propertyId, userId });
    if (!property) {
      return NextResponse.json({ ok: false, error: "Property not found" }, { status: 404 });
    }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const timestamp = Date.now();
    const blobPathname = `property-images/${userId}/${propertyId}-${timestamp}.${ext}`;

    const blob = await put(blobPathname, file, {
      access: "private",
      addRandomSuffix: false,
      contentType: file.type,
    });

    // Cache-bust the proxy URL per upload so the browser never shows a stale
    // photo after "Change photo" — the pathname (and therefore the response)
    // is different every time, even though propertyId stays the same.
    const proxyUrl = `/api/properties/image?propertyId=${encodeURIComponent(propertyId)}&v=${timestamp}`;

    const prevBlobPathname = typeof property.imageBlobPath === "string" ? property.imageBlobPath : "";

    await db.collection("properties").updateOne(
      { id: propertyId, userId },
      { $set: { image: proxyUrl, imageBlobPath: blob.pathname } }
    );

    if (prevBlobPathname && prevBlobPathname !== blob.pathname) {
      del(prevBlobPathname).catch(() => {});
    }

    return NextResponse.json({ ok: true, url: proxyUrl });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Photo upload failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}

// Auth proxy: streams the private blob content for a property photo. The
// browser's <img> tag hits this route directly (same-origin, so the session
// cookie is sent automatically) instead of trying to load a Blob URL, which
// isn't publicly reachable on a private store.
export async function GET(req: NextRequest) {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;

  if (!process.env.BLOB_READ_WRITE_TOKEN) return missingTokenResponse();

  const propertyId = req.nextUrl.searchParams.get("propertyId");
  if (!propertyId) {
    return NextResponse.json({ ok: false, error: "propertyId required" }, { status: 400 });
  }

  const property = await db.collection("properties").findOne({ id: propertyId, userId });
  const blobPathname = typeof property?.imageBlobPath === "string" ? property.imageBlobPath : "";
  if (!blobPathname) {
    return NextResponse.json({ ok: false, error: "No photo uploaded for this property" }, { status: 404 });
  }

  try {
    const result = await get(blobPathname, { access: "private" });
    if (!result || result.statusCode !== 200) {
      return NextResponse.json({ ok: false, error: "Photo not found" }, { status: 404 });
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType || "image/jpeg",
        // Safe to cache indefinitely — the URL is versioned per upload (see ?v=).
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Failed to load photo: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}