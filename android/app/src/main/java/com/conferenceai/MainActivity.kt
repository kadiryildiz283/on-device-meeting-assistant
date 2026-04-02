package com.conferenceai

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import java.security.SecureRandom
import java.security.cert.X509Certificate
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
      super.onCreate(savedInstanceState)
      handleSSLHandshake()
  }

  /**
   * Geliştirme aşamasında model indirirken yaşanabilecek SSL sertifika 
   * hatalarını atlamak için tüm sertifikalara güvenen TrustManager.
   */
  private fun handleSSLHandshake() {
      try {
          val trustAllCerts = arrayOf<TrustManager>(object : X509TrustManager {
              override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
              override fun checkClientTrusted(certs: Array<X509Certificate>, authType: String) {}
              override fun checkServerTrusted(certs: Array<X509Certificate>, authType: String) {}
          })

          val sc = SSLContext.getInstance("TLS")
          sc.init(null, trustAllCerts, SecureRandom())
          HttpsURLConnection.setDefaultSSLSocketFactory(sc.socketFactory)
          HttpsURLConnection.setDefaultHostnameVerifier { _, _ -> true }
      } catch (e: Exception) {
          e.printStackTrace()
      }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "ConferenceAi"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
