$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
foreach ($kind in @('any', 'maskable')) {
    $sourceName = if ($kind -eq 'any') { 'master-rounded.png' } else { 'master-maskable.png' }
    $source = [System.Drawing.Bitmap]::new((Join-Path $PSScriptRoot $sourceName))
    try {
        foreach ($size in @(192, 512)) {
            $format = if ($kind -eq 'any') { [System.Drawing.Imaging.PixelFormat]::Format32bppArgb } else { [System.Drawing.Imaging.PixelFormat]::Format24bppRgb }
            $bitmap = [System.Drawing.Bitmap]::new($size, $size, $format)
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            $attributes = [System.Drawing.Imaging.ImageAttributes]::new()
            try {
                $graphics.Clear([System.Drawing.Color]::Transparent)
                $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                $attributes.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
                # Crop only excess green margin of the generated maskable master.
                $fraction = if ($kind -eq 'any') { 1.0 } else { 0.76 }
                $width = $source.Width * $fraction
                $height = $source.Height * $fraction
                $left = ($source.Width - $width) / 2
                $top = ($source.Height - $height) / 2
                $rect = [System.Drawing.Rectangle]::new(0, 0, $size, $size)
                $graphics.DrawImage($source, $rect, [single]$left, [single]$top, [single]$width, [single]$height, [System.Drawing.GraphicsUnit]::Pixel, $attributes)
                $bitmap.Save((Join-Path $PSScriptRoot "public/icons/a-$kind-$size-r2.png"), [System.Drawing.Imaging.ImageFormat]::Png)
            } finally { $attributes.Dispose(); $graphics.Dispose(); $bitmap.Dispose() }
        }
    } finally { $source.Dispose() }
}
