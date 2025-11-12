/**
 * IMAGE TO WEBP CONVERTER
 *
 * Standalone script to convert images in a folder to WebP format.
 * Recursively processes all supported image formats and maintains aspect ratios.
 *
 * HOW TO RUN:
 *   npx tsx scripts/convertToWebP.ts [folder-path]
 *
 * EXAMPLES:
 *   npx tsx scripts/convertToWebP.ts ./assets/images
 *   npx tsx scripts/convertToWebP.ts ./public/photos
 *
 * CONFIGURATION:
 *   Edit the constants below to customize:
 *   - QUALITY: WebP compression quality (1-100, default: 100)
 *   - MAX_WIDTH/MAX_HEIGHT: Maximum dimensions (default: 2500px)
 *   - OVERWRITE_ORIGINALS: Delete original files after conversion (default: false)
 *
 * SUPPORTED FORMATS:
 *   .jpg, .jpeg, .png, .gif, .tiff, .webp, .avif
 *
 * FEATURES:
 *   ✓ Recursively scans all subdirectories
 *   ✓ Maintains aspect ratio when resizing
 *   ✓ Shows compression stats for each file
 *   ✓ Provides total space saved summary
 *   ✓ Preserves original files by default
 */

/* eslint-disable no-console */

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

// ============================================
// CONFIGURATION - Adjust these as needed
// ============================================
const QUALITY = 95 // WebP quality (1-100, 100 = maximum quality)
const MAX_WIDTH = 1024 // Maximum width in pixels
const MAX_HEIGHT = 1024 // Maximum height in pixels
const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.webp', '.avif']
const OVERWRITE_ORIGINALS = false // Set to true to replace original files
const BYTES_PER_KILOBYTE = 1024
// ============================================

type ConversionResult = {
  originalPath: string
  outputPath: string
  originalSize: number
  compressedSize: number
  compressionRatio: number
  success: boolean
  error?: string
}

type ConversionOptions = {
  inputPath: string
  outputPath: string
}

/**
 * Convert a single image to WebP format
 */
async function convertImageToWebP({
  inputPath,
  outputPath,
}: ConversionOptions): Promise<ConversionResult> {
  const originalSize = fs.statSync(inputPath).size

  try {
    // Process image with Sharp
    const image = sharp(inputPath)
    const metadata = await image.metadata()

    // Calculate dimensions while maintaining aspect ratio
    let width = metadata.width
    let height = metadata.height

    if (width && height) {
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
    }

    // Convert to WebP
    await image
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: QUALITY })
      .toFile(outputPath)

    const compressedSize = fs.statSync(outputPath).size
    const compressionRatio = Math.round((1 - compressedSize / originalSize) * 100)

    return {
      originalPath: inputPath,
      outputPath,
      originalSize,
      compressedSize,
      compressionRatio,
      success: true,
    }
  } catch (error) {
    return {
      originalPath: inputPath,
      outputPath,
      originalSize,
      compressedSize: 0,
      compressionRatio: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check if a file has a supported image format
 */
function isSupportedImageFormat(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase()
  return SUPPORTED_FORMATS.includes(extension)
}

/**
 * Recursively find all image files in a directory
 */
function findImageFiles(directory: string): string[] {
  const imageFiles: string[] = []

  function traverseDirectory(currentDirectory: string): void {
    const items = fs.readdirSync(currentDirectory)

    for (const item of items) {
      const fullPath = path.join(currentDirectory, item)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        traverseDirectory(fullPath)
      } else if (stat.isFile() && isSupportedImageFormat(fullPath)) {
        imageFiles.push(fullPath)
      }
    }
  }

  traverseDirectory(directory)
  return imageFiles
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const exponent = Math.floor(Math.log(bytes) / Math.log(BYTES_PER_KILOBYTE))
  const formattedSize = Math.round((bytes / Math.pow(BYTES_PER_KILOBYTE, exponent)) * 100) / 100

  return `${formattedSize} ${sizes[exponent]}`
}

/**
 * Validate that the provided folder path exists and is a directory
 */
function validateFolderPath(folderPath: string | undefined): string {
  if (!folderPath) {
    console.error('❌ Error: Please provide a folder path')
    console.error('Usage: npx tsx scripts/convertToWebP.ts [folder-path]')
    console.error('Example: npx tsx scripts/convertToWebP.ts ./assets/images')
    process.exit(1)
  }

  const absolutePath = path.resolve(folderPath)

  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ Error: Folder not found: ${absolutePath}`)
    process.exit(1)
  }

  if (!fs.statSync(absolutePath).isDirectory()) {
    console.error(`❌ Error: Path is not a directory: ${absolutePath}`)
    process.exit(1)
  }

  return absolutePath
}

/**
 * Display configuration information
 */
function displayConfiguration(absolutePath: string): void {
  console.log('🔍 Searching for images...')
  console.log(`📁 Directory: ${absolutePath}`)
  console.log(`⚙️  Quality: ${QUALITY}`)
  console.log(`📏 Max dimensions: ${MAX_WIDTH}x${MAX_HEIGHT}px`)
  console.log('')
}

/**
 * Check if a file should be skipped (already WebP with same path)
 */
function shouldSkipFile(inputPath: string, outputPath: string): boolean {
  return path.extname(inputPath).toLowerCase() === '.webp' && inputPath === outputPath
}

/**
 * Display conversion summary
 */
function displaySummary(
  results: ConversionResult[],
  totalOriginalSize: number,
  totalCompressedSize: number,
): void {
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 CONVERSION SUMMARY')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const successfulConversions = results.filter((result) => result.success).length
  const failedConversions = results.filter((result) => !result.success).length

  console.log(`✅ Successful: ${successfulConversions}`)
  console.log(`❌ Failed: ${failedConversions}`)
  console.log(`📦 Total original size: ${formatBytes(totalOriginalSize)}`)
  console.log(`📦 Total compressed size: ${formatBytes(totalCompressedSize)}`)

  if (totalOriginalSize > 0) {
    const totalReduction = Math.round((1 - totalCompressedSize / totalOriginalSize) * 100)
    const spaceSaved = totalOriginalSize - totalCompressedSize
    console.log(
      `💾 Total space saved: ${formatBytes(spaceSaved)} (${totalReduction}% reduction)`,
    )
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const folderPath = process.argv[2]
  const absolutePath = validateFolderPath(folderPath)

  displayConfiguration(absolutePath)

  const imageFiles = findImageFiles(absolutePath)

  if (imageFiles.length === 0) {
    console.log('ℹ️  No supported image files found')
    console.log(`Supported formats: ${SUPPORTED_FORMATS.join(', ')}`)
    process.exit(0)
  }

  console.log(`✅ Found ${imageFiles.length} image(s)`)
  console.log('')

  const results: ConversionResult[] = []
  let totalOriginalSize = 0
  let totalCompressedSize = 0

  for (let i = 0; i < imageFiles.length; i++) {
    const inputPath = imageFiles[i]
    const fileNameWithoutExtension = path.basename(inputPath, path.extname(inputPath))
    const directory = path.dirname(inputPath)
    const outputPath = path.join(directory, `${fileNameWithoutExtension}.webp`)

    if (shouldSkipFile(inputPath, outputPath)) {
      console.log(
        `⏭️  [${i + 1}/${imageFiles.length}] Skipping: ${path.relative(absolutePath, inputPath)} (already WebP)`,
      )
      continue
    }

    console.log(
      `🔄 [${i + 1}/${imageFiles.length}] Converting: ${path.relative(absolutePath, inputPath)}`,
    )

    const result = await convertImageToWebP({ inputPath, outputPath })
    results.push(result)

    if (result.success) {
      totalOriginalSize += result.originalSize
      totalCompressedSize += result.compressedSize

      console.log(
        `   ✅ Success: ${formatBytes(result.originalSize)} → ${formatBytes(result.compressedSize)} (${result.compressionRatio}% reduction)`,
      )

      const isNotWebPOriginal = path.extname(inputPath).toLowerCase() !== '.webp'
      if (OVERWRITE_ORIGINALS && inputPath !== outputPath && isNotWebPOriginal) {
        fs.unlinkSync(inputPath)
        console.log(`   🗑️  Deleted original: ${path.basename(inputPath)}`)
      }
    } else {
      console.log(`   ❌ Failed: ${result.error}`)
    }
  }

  displaySummary(results, totalOriginalSize, totalCompressedSize)
}

// Run the script
main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
