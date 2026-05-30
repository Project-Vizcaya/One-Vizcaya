# Parse the hires GeoJSON and generate municipalities.js with accurate boundaries
$json = Get-Content "$env:TEMP\nv_hires.json" -Raw | ConvertFrom-Json

$colorMap = @{
  "Alfonso Castaneda" = "#B8D8A8"
  "Ambaguio"          = "#B8D4E8"
  "Aritao"            = "#D8A8A8"
  "Bagabag"           = "#A8C8E8"
  "Bambang"           = "#A8C8A0"
  "Bayombong"         = "#E8A898"
  "Diadi"             = "#E8C87A"
  "Dupax del Norte"   = "#C8A8D8"
  "Dupax del Sur"     = "#C8A878"
  "Kasibu"            = "#E8C8A0"
  "Kayapa"            = "#EEE8A0"
  "Quezon"            = "#A8C8C8"
  "Santa Fe"          = "#A8B8D8"
  "Solano"            = "#C8A882"
  "Villaverde"        = "#9B8EC4"
}

$lines = [System.Collections.ArrayList]::new()
[void]$lines.Add("// Polygon boundaries for Nueva Vizcaya municipalities.")
[void]$lines.Add("// Coordinates: [longitude, latitude] (GeoJSON order).")
[void]$lines.Add("//")
[void]$lines.Add("// Source: faeldon/philippines-json-maps (2023)")
[void]$lines.Add("//   PSA PSGC 2023 -- high-resolution simplified boundaries (10%)")
[void]$lines.Add("//   File: municities-provdist-205000000.0.1.json")
[void]$lines.Add("//")
[void]$lines.Add("// Province PSGC: 205000000 (Region II -- Cagayan Valley)")
[void]$lines.Add("// NV_CENTER and NV_ZOOM are defined in config.js")
[void]$lines.Add("")
[void]$lines.Add("const NV_MUNICIPALITIES = [")

foreach ($feature in $json.features) {
  $name = $feature.properties.ADM3_EN
  $geomType = $feature.geometry.type
  
  # Map names to match existing app naming
  $displayName = $name
  if ($name -eq "Alfonso Castaneda") { $displayName = "Alfonso Casta" + [char]0x00F1 + "eda" }
  
  $color = $colorMap[$name]
  if (-not $color) { $color = "#AAAAAA" }
  
  $dashes = "-" * 60
  [void]$lines.Add("  // == $($displayName.ToUpper()) $dashes")
  [void]$lines.Add("  {")
  [void]$lines.Add("    name: `"$displayName`",")
  [void]$lines.Add("    color: `"$color`",")
  
  $coords = $feature.geometry.coordinates[0]
  [void]$lines.Add("    polygon: [")
  foreach ($coord in $coords) {
    $lng = [Math]::Round($coord[0], 6)
    $lat = [Math]::Round($coord[1], 6)
    [void]$lines.Add("      [$lng, $lat],")
  }
  [void]$lines.Add("    ]")
  [void]$lines.Add("  },")
  [void]$lines.Add("")
}

[void]$lines.Add("];")
[void]$lines.Add("")
[void]$lines.Add("function getMuniBounds(muniName) {")
[void]$lines.Add("  const muni = NV_MUNICIPALITIES.find(m => m.name === muniName);")
[void]$lines.Add("  if (!muni) return null;")
[void]$lines.Add("  const bounds = new google.maps.LatLngBounds();")
[void]$lines.Add("  muni.polygon.forEach(([lng, lat]) => bounds.extend({ lat, lng }));")
[void]$lines.Add("  return bounds;")
[void]$lines.Add("}")
[void]$lines.Add("")
[void]$lines.Add("function getProvinceBounds() {")
[void]$lines.Add("  const bounds = new google.maps.LatLngBounds();")
[void]$lines.Add("  NV_MUNICIPALITIES.forEach(m =>")
[void]$lines.Add("    m.polygon.forEach(([lng, lat]) => bounds.extend({ lat, lng }))")
[void]$lines.Add("  );")
[void]$lines.Add("  return bounds;")
[void]$lines.Add("}")

$outPath = "c:\Users\Administrator\Documents\GitHub\One-Vizcaya\one_vizcaya\web_admin\js\municipalities.js"
$lines -join "`r`n" | Set-Content $outPath -Encoding UTF8

# Report
foreach ($feature in $json.features) {
  $name = $feature.properties.ADM3_EN
  $count = $feature.geometry.coordinates[0].Count
  Write-Host "$name : $count pts"
}
Write-Host ""
Write-Host "Generated municipalities.js with hires boundaries"
Write-Host "File size: $((Get-Item $outPath).Length) bytes"
