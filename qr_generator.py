import qrcode

# Lien de votre application
url = "https://levelmak-pro-five.vercel.app/"

# Génération du QR Code
qr = qrcode.make(url)

# Sauvegarde de l'image
qr.save("qr_levelmak_pro.png")
print("QR code généré avec succès !")
