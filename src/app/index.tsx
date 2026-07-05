import React, { useEffect } from "react";
import { Platform, StatusBar, StyleSheet, View } from "react-native";
import GameCanvas from "../components/GameCanvas";

export default function GameScreen() {
  useEffect(() => {
    if (Platform.OS === "android") {
      // Make nav bar fully transparent so game fills the whole screen
      try {
        const NavigationBar = require("expo-navigation-bar");
        NavigationBar.setBackgroundColorAsync("#00000000");
        NavigationBar.setButtonStyleAsync("light");
        NavigationBar.setBehaviorAsync("overlay-swipe");
      } catch {}
    }
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar hidden translucent backgroundColor="transparent" />
      <GameCanvas />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
});
