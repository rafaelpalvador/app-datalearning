plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "app.bordas"
    compileSdk = 35

    defaultConfig {
        applicationId = "app.bordas.gestos"
        minSdk = 26
        targetSdk = 35
        // versionCode cresce a cada build do CI para o Android aceitar atualizações
        versionCode = (System.getenv("VERSION_CODE") ?: "1").toInt()
        versionName = System.getenv("VERSION_NAME") ?: "1.0.0"
    }

    signingConfigs {
        create("release") {
            // Mesma chave de sideload do Datum (pública de propósito) ou a chave privada dos secrets.
            val ks = System.getenv("ANDROID_KEYSTORE_FILE")
            storeFile = file(ks ?: "${rootDir}/../android/keystore/datalingo-sideload.jks")
            storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD") ?: "datalingo"
            keyAlias = System.getenv("ANDROID_KEY_ALIAS") ?: "datalingo"
            keyPassword = System.getenv("ANDROID_KEY_PASSWORD") ?: "datalingo"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(composeBom)
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    testImplementation("junit:junit:4.13.2")
}
