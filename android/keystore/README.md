# Chave de assinatura para instalação direta (sideload)

`datalingo-sideload.jks` (senha `datalingo`, alias `datalingo`) é uma chave **pública de propósito**:
ela serve para que todo APK gerado pelo GitHub Actions tenha a MESMA assinatura,
permitindo instalar atualizações por cima sem desinstalar (e sem perder o progresso).

Para publicar na Google Play / AppGallery, gere uma chave privada e configure os
secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`
e `ANDROID_KEY_PASSWORD` no repositório — o build passa a usá-la automaticamente.
