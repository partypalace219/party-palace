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
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/edge-glued-square-panel/square3.jpeg',
    ],
    'Edge Glued Round Panel': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/edge-glued-round-panel/round1.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/edge-glued-round-panel/round2.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/edge-glued-round-panel/round3.jpeg',
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
    'Star Fidget': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/star-fidget/fidget1.jpeg',
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/star-fidget/fidget2.jpeg',
    ],
    'Finger Fidget Spinner': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/finger-fidget-spinner/spinner1.jpeg',
    ],
    'Flexi Fish': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/flexi-fish/fish1.jpeg',
    ],
    'Octagon Fidget': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/octagon-fidget/fidget1.jpeg',
    ],
    'Infinity Cube': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/infinity-cube/cube1.jpeg',
    ],
    'Flexi Dinosaur': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/flexi-dinosaur/dino1.jpeg',
    ],
    'Snail': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/snail/snail1.jpeg',
    ],
    'Twisty Lizard': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/twisty-lizard/lizard1.jpeg',
    ],
    'Palestine Map': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/palestine-map/map1.jpeg',
    ],
    'Ramadan Mubarak': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/ramadan-mubarak/sign1.jpeg',
    ],
    'Ramadan Kareem': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/ramadan-kareem/sign1.jpeg',
    ],
    'Bismillah': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/bismillah/sign1.jpeg',
    ],
    'Morning Dua': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/morning-dua/sign1.jpeg',
    ],
    'La ilaha ila Allah': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/la-ilaha-ila-allah/sign1.jpeg',
    ],
    'Mohammed': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/mohammed/sign1.jpeg',
    ],
    'Evening Dua': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/evening-dua/sign1.jpeg',
    ],
    'Heart with Names': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/heart-with-names/sign1.jpeg',
    ],
    'Bismillah with Arch': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/bismillah-with-arch/sign1.jpeg',
    ],
    'Allah': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/allah/sign1.jpeg',
    ],
    'Muhammad with Background': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/muhammad-with-background/sign1.jpeg',
    ],
    'Eid Mubarak': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/eid-mubarak/sign1.jpeg',
    ],
    'Eid Mubarak Rectangle': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/eid-mubarak-rectangle/sign1.jpeg',
    ],
    'Eid Mubarak Ornaments': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/eid-mubarak-ornaments/decor1.jpeg',
    ],
    'Palestine Map Ornament': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/palestine-map-ornament/decor1.jpeg',
    ],
    'Kaaba Ornaments': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/kaaba-ornaments/decor1.jpeg',
    ],
    'Moon Ornament': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/moon-ornament/decor1.jpeg',
    ],
    'Masjid Ornament': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/masjid-ornament/decor1.jpeg',
    ],
    'Star Ornament': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/star-ornament/decor1.jpeg',
    ],
    'Lantern Style 1 Ornament': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/lantern-style-1-ornament/decor1.jpeg',
    ],
    'Lantern Style 2 Ornament': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/lantern-style-2-ornament/decor1.jpeg',
    ],
    'Lantern Style 3 Ornament': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/lantern-style-3-ornament/decor1.jpeg',
    ],
    'Ramadan Relief Sculpture': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/ramadan-relief-sculpture/decor1.jpeg',
    ],
    'Kaaba Relief Sculpture': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/kaaba-relief-sculpture/decor1.jpeg',
    ],
    'Camel Relief Sculpture': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/camel-relief-sculpture/decor1.jpeg',
    ],
    'Masjid Relief Sculpture': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/masjid-relief-sculpture/decor1.jpeg',
    ],
    'Customizable Keychains': [
        'https://nsedpvrqhxcikhlieize.supabase.co/storage/v1/object/public/product-images/customizable-keychains/keychain1.jpeg',
    ],
};

// Helper function to get gallery images for a product
function getProductGalleryImages(productName) {
    return productGalleryImages[productName] || [];
}
