import { ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { translateLocalAppSurfaceText } from "@foundation/app-surface";
import { MOBILE_SCREEN_REGISTRY, getMobileScreenById } from "./src/screen-registry";

const homeScreen = getMobileScreenById("mobile-screen-developer-home");
const text = {
  kicker: translateLocalAppSurfaceText("mobile.developerHome.kicker"),
  title: translateLocalAppSurfaceText("mobile.developerHome.title"),
  body: translateLocalAppSurfaceText("mobile.developerHome.body"),
  capabilityLabel: translateLocalAppSurfaceText("mobile.developerHome.capabilityLabel"),
  permissionLabel: translateLocalAppSurfaceText("mobile.developerHome.permissionLabel"),
  unknownScreenPolicyLabel: translateLocalAppSurfaceText("mobile.developerHome.unknownScreenPolicyLabel"),
};

export default function App() {
  return (
    <View style={styles.shell}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>{text.kicker.value}</Text>
        <Text style={styles.title}>{text.title.value}</Text>
        <Text style={styles.body}>{text.body.value}</Text>
        <View style={styles.card}>
          <Text style={styles.label}>{text.capabilityLabel.value}</Text>
          <Text style={styles.value}>{homeScreen.capabilityId}</Text>
          <Text style={styles.label}>{text.permissionLabel.value}</Text>
          <Text style={styles.value}>{homeScreen.permissionRefs.join(", ")}</Text>
          <Text style={styles.label}>{text.unknownScreenPolicyLabel.value}</Text>
          <Text style={styles.value}>{MOBILE_SCREEN_REGISTRY.unknownScreenPolicy}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#f5efe4",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 28,
  },
  kicker: {
    color: "#6c4f2a",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.3,
    marginBottom: 14,
    textTransform: "uppercase",
  },
  title: {
    color: "#1f2933",
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40,
    marginBottom: 14,
  },
  body: {
    color: "#3f4f5f",
    fontSize: 17,
    lineHeight: 25,
    marginBottom: 22,
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#dbc8a8",
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
  },
  label: {
    color: "#7a5b31",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 12,
    textTransform: "uppercase",
  },
  value: {
    color: "#1f2933",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
});
