
// Test script pour vérifier l'intégration Google Books API
async function testGoogleBooks() {
    console.log("Testing Google Books API integration...\n");

    const testQuery = "pere riche pere pauvre";
    const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(testQuery)}&maxResults=5&langRestrict=fr`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        console.log(`✅ Status: ${response.status} ${response.statusText}`);
        console.log(`📚 Total items found: ${data.totalItems || 0}`);
        console.log(`📖 Returned: ${data.items?.length || 0} books\n`);

        if (data.items && data.items.length > 0) {
            console.log("First 3 books:");
            data.items.slice(0, 3).forEach((item, i) => {
                const vol = item.volumeInfo;
                const access = item.accessInfo;
                console.log(`\n${i + 1}. ${vol.title}`);
                console.log(`   Authors: ${vol.authors?.join(", ") || "N/A"}`);
                console.log(`   PDF: ${access.pdf?.isAvailable ? "✓" : "✗"}`);
                console.log(`   EPUB: ${access.epub?.isAvailable ? "✓" : "✗"}`);
                console.log(`   Preview: ${vol.previewLink ? "✓" : "✗"}`);
                console.log(`   Thumbnail: ${vol.imageLinks?.thumbnail ? "✓" : "✗"}`);
            });
            console.log("\n✅ Google Books API is working perfectly!");
        } else {
            console.log("⚠️ No results found");
        }
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

testGoogleBooks();
