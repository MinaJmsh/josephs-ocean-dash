import React from "react";
import { StyleSheet, View, StatusBar } from "react-native";
import GameCanvas from "../components/GameCanvas";

export default function GameScreen() {
  return (
    <View style={styles.root}>
      <StatusBar hidden />
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
