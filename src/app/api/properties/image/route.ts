import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getAuthDb } from "@/lib/apiAuth";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Photo storage isn't configured yet (missing BLOB_READ_WRITE_TOKEN). Add it in Vercel project settings, then try again.",
      },
      { status: 503 }
    );
  }

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
    const blobName = `property-images/${userId}/${propertyId}-${Date.now()}.${ext}`;

    const blob = await put(blobName, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
    });

    await db.collection("properties").updateOne(
      { id: propertyId, userId },
      { $set: { image: blob.url } }
    );

    // Best-effort cleanup of the previous photo if it was one of our blobs.
    const prevImage = typeof property.image === "string" ? property.image : "";
    if (prevImage && prevImage.includes("blob.vercel-storage.com") && prevImage !== blob.url) {
      del(prevImage).catch(() => {});
    }

    return NextResponse.json({ ok: true, url: blob.url });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Photo upload failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
