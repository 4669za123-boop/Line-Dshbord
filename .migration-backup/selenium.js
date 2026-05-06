async function checkLine() {
    console.log("🤖 Selenium running...")
  
    return {
      status: "OK",
      unread: Math.floor(Math.random() * 10)
    }
  }
  
  module.exports = { checkLine }