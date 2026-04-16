import * as fs from "fs";
import { S3Client, PutObjectCommand, PutObjectCommandOutput } from "@aws-sdk/client-s3";
import { join } from "path";

// Initialize the S3 Client
const s3Client = new S3Client({ region: "us-west-1" });

// Map file extensions to correct Content-Type to ensure browser compatibility
const contentTypeMap: { [ext: string]: string } = {
	".html": "text/html",
	".css": "text/css",
	".js": "application/javascript",
	".mjs": "application/javascript",
	".json": "application/json",
	".ico": "image/x-icon",
	".png": "image/png",
	".jpg": "image/jpeg",
	".svg": "image/svg+xml",
	".webp": "image/webp",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".pdf": "application/pdf",
	".mp4": "video/mp4",
	".mov": "video/quicktime",
	".webm": "video/webm",
	".txt": "text/plain",
	".map": "application/json",
	".wasm": "application/wasm",
};

function getContentType(filename: string) {
	for (const ext in contentTypeMap) {
		if (filename.endsWith(ext)) return contentTypeMap[ext];
	}
	return "binary/octet-stream";
}

function getCacheControl(key: string): string {
	if (key.endsWith(".html")) return "no-cache";
	if (key.includes("/assets/")) return "public, max-age=31536000, immutable";
	return "public, max-age=86400";
}

/**
 * Uploads a local directory to an S3 bucket with an optional prefix (sub-folder)
 * @param localDir The local folder to upload (e.g., "dist")
 * @param bucketName The name of your S3 bucket
 * @param rootPrefix The sub-folder path in S3 (e.g., "my-game-project")
 */
async function uploadDirectory(localDir: string, bucketName: string, rootPrefix: string = "") {
	// 1. Format the root prefix: remove leading/trailing slashes, then add one at the end if not empty
	const cleanRoot = rootPrefix.replace(/^\/+|\/+$/g, "");
	const finalPrefix = cleanRoot ? `${cleanRoot}/` : "";

	async function internalUpload(currentDir: string, s3SubPath: string = "") {
		const entries: string[] = fs.readdirSync(currentDir);

		for (const entry of entries) {
			const fullPath = join(currentDir, entry);
			const stats = fs.statSync(fullPath);

			if (stats.isDirectory()) {
				// Recurse into subdirectories
				await internalUpload(fullPath, `${s3SubPath}${entry}/`);
			} else {
				try {
					// The S3 Key = Root Prefix + relative path within the dist folder
					const key = `${finalPrefix}${s3SubPath}${entry}`;
					const contentType = getContentType(key);

					const params = {
						Bucket: bucketName,
						Key: key,
						Body: fs.createReadStream(fullPath),
						ContentType: contentType,
						ContentDisposition: "inline",
						CacheControl: getCacheControl(key),
					};

					const uploadResponse: PutObjectCommandOutput = await s3Client.send(new PutObjectCommand(params));
					console.log(
						`Uploaded ${key} with Content-Type "${contentType}" (HTTP: ${uploadResponse.$metadata.httpStatusCode})`,
					);
				} catch (error) {
					console.error(`❌ Error uploading ${entry}:`, error);
				}
			}
		}
	}

	console.log(`🚀 Starting upload to S3://${bucketName}/${finalPrefix}...`);
	await internalUpload(localDir);
	console.log("✨ Upload complete!");
}

// ==========================================
// CONFIGURATION & START
// ==========================================

const LOCAL_DIST_DIR = "dist";
const TARGET_BUCKET = "jack-johnson-portfolio";
const SUB_FOLDER_NAME = "/agenda/"; // Change this to your desired project prefix

uploadDirectory(LOCAL_DIST_DIR, TARGET_BUCKET, SUB_FOLDER_NAME).catch(console.error);
