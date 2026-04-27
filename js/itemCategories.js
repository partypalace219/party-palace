/**
 * itemCategories.js
 *
 * Defines ITEM_CATEGORIES — the canonical list of top-level product categories
 * and their sub-categories used across Party Palace.
 *
 * Usage (browser):
 *   Load via <script src="js/itemCategories.js"></script>
 *   Then access window.ITEM_CATEGORIES
 *
 * Structure:
 *   ITEM_CATEGORIES[categoryName] = [subCategory, ...]
 */

const ITEM_CATEGORIES = {
    "Party Decor": [
        "Arches",
        "Columns",
        "Walls",
        "Centerpieces"
    ],
    "Party Rentals": [
        "Tables",
        "Chairs",
        "Tents",
        "Games",
        "Concessions"
    ],
    "3D Prints": [
        "Toys",
        "Signs",
        "Decor",
        "Miscellaneous"
    ],
    "Engraving": [
        "Wood",
        "Metal",
        "Leather",
        "Acrylic",
        "Specialty Materials"
    ]
};

// Expose globally for browser script-tag consumption (no bundler)
if (typeof window !== 'undefined') {
    window.ITEM_CATEGORIES = ITEM_CATEGORIES;
}
