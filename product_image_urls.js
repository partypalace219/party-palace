// Product Gallery Images from Supabase Storage
// Images sorted by quality: best to worst
const productGalleryImages = {
    'Balloon Walls': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/balloon-walls/wall5.jpeg',  // 1600x1200, 259KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/balloon-walls/wall6.jpeg',  // 1600x1200, 247KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/balloon-walls/wall4.jpeg',  // 1600x1200, 203KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/balloon-walls/wall1.jpeg',  // 1200x1600, 197KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/balloon-walls/wall2.jpeg',  // 1200x1600, 186KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/balloon-walls/wall3.jpeg',  // 1200x1600, 167KB
    ],
    'Spiral Arch': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/spiral-arch/spiral1.jpeg',  // 1600x1200, 223KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/spiral-arch/spiral2.jpeg',  // 1600x1200, 207KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/spiral-arch/speciality1.jpeg',  // 1208x899, 204KB
    ],
    'Circle Arch': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/circle/circle2.jpeg',  // 1200x1600, 212KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/circle/circle1.jpeg',  // 1600x1200, 175KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/circle/circle4.jpeg',  // 1600x1200, 163KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/circle/circle3.jpeg',  // 1600x1200, 158KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/circle/circle5.jpeg',  // 1200x1600, 170KB
    ],
    'L-Shaped Arch': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/L-shaped/shaped3.jpeg',  // 1600x1200, 239KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/L-shaped/shaped1.jpeg',  // 1600x1200, 207KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/L-shaped/shaped4.jpeg',  // 1600x1200, 198KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/L-shaped/shaped2.jpeg',  // 1600x1200, 160KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/L-shaped/shaped5.jpeg',  // 1200x1600, 170KB
    ],
    'Vases': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/Vases/vase5.jpeg',  // 1500x2000, 362KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/Vases/vase3.jpeg',  // 1500x2000, 303KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/Vases/vase1.jpeg',  // 1500x2000, 290KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/Vases/vase4.jpeg',  // 1500x2000, 284KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/Vases/vase8.jpeg',  // 1500x2000, 249KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/Vases/vase6.jpeg',  // 1500x2000, 243KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/Vases/vase2.jpeg',  // 1500x2000, 239KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/Vases/vase7.jpeg',  // 1500x2000, 216KB
    ],
    'Diaper Cakes': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/diaper-cake/diaper2.jpeg',  // 1500x2000, 323KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/diaper-cake/diaper1.jpeg',  // 1500x2000, 226KB
    ],
    'Balloon Centerpieces': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/balloon-centerpiece/balloon1.jpeg',
    ],
    'Medal Frames': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/medal-centerpieces/metal1.jpeg',  // 1500x2000, 150KB
    ],
    'Shimmer Walls': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/shimmer-wall/shimmer1.jpeg',  // 1600x1200, 286KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/shimmer-wall/shimmer3.jpeg',  // 1200x1600, 282KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/shimmer-wall/shimmer2.jpeg',  // 1200x1600, 267KB
    ],
    'Flower Walls': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/flower-wall/flower2.jpeg',  // 1600x1200, 278KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/flower-wall/flower1.jpeg',  // 1600x1200, 236KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/flower-wall/flower3.jpeg',  // 1200x1600, 201KB
    ],
    'Organic Arch': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic11.jpeg',  // 1600x1200, 216KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic4.jpeg',  // 1200x1600, 246KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic5.jpeg',  // 1200x1600, 245KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic7.jpeg',  // 1600x1200, 208KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic1.jpeg',  // 1600x1200, 193KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic6.jpeg',  // 1600x1200, 189KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic9.jpeg',  // 1600x1200, 188KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic2.jpeg',  // 1600x1200, 170KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic3.jpeg',  // 1200x1600, 174KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic13.jpeg',  // 1600x1200, 150KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic8.jpeg',  // 1600x1200, 139KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic10.jpeg',  // 1200x1600, 158KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic14.jpeg',  // 1600x1200, 121KB
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-arch/organic12.jpeg',  // 752x690, 61KB
    ],
    'Specialty Arch': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/specialty-arch/specialty1.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/specialty-arch/specialty2.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/specialty-arch/specialty3.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/specialty-arch/specialty4.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/specialty-arch/specialty5.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/specialty-arch/specialty6.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/specialty-arch/specialty7.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/specialty-arch/specialty8.jpeg',
    ],
    'Chiara Arch': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/chiara-arch/chiara1.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/chiara-arch/chiara2.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/chiara-arch/chiara3.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/chiara-arch/chiara4.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/chiara-arch/chiara5.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/chiara-arch/chiara6.jpeg',
    ],
    'Spiral Columns': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/spiral-columns/spiral1.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/spiral-columns/spiral2.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/spiral-columns/spiral3.jpeg',
    ],
    'Organic Columns': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-columns/organic1.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-columns/organic2.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/organic-columns/organic3.jpeg',
    ],
    'Specialty Columns': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/speciality-columns/specialty1.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/speciality-columns/specialty2.jpeg',
    ],
    'Edge Glued Square Panel': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/edge-glued-square-panel/square1.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/edge-glued-square-panel/square2.jpeg',
    ],
    'Edge Glued Round Panel': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/edge-glued-round-panel/round1.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/edge-glued-round-panel/round2.jpeg',
    ],
    'Rectangle Wood Keychain': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/rectangle-wood-keychain/keychain1.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/rectangle-wood-keychain/keychain2.jpeg',
    ],
    'Round Stainless Steel Keychain': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/round-stainless-steel-keychain/keychain1.jpeg',
    ],
    'Black Acrylic Plexiglass Sheet': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/black-acrylic-plexiglass-sheet/acrylic1.jpeg',
    ],
    'Unfinished Rustic Wood Rounds': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/unfinished-rustic-wood-rounds/rounds1_v2.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/unfinished-rustic-wood-rounds/rounds2_v2.jpeg',
    ],
    'Round Basswood Plywood Coaster': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/round-basswood-plywood-coaster/coasters1.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/round-basswood-plywood-coaster/coasters2.jpeg',
    ],
    '3 Foot Snake': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/3-foot-snake/snake1.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/3-foot-snake/snake2.jpeg',
    ],
};

// Helper function to get gallery images for a product
function getProductGalleryImages(productName) {
    return productGalleryImages[productName] || [];
}
