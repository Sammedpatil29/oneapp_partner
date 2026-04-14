
### Command to sign a .aab file from local
`jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore pintu-partner.keystore app-release.aab pintu-alias`

### Command to open keystore or .jks file
`keytool -list -v -keystore pintu-partner.keystore`