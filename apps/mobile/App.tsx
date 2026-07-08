import { ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { MOBILE_SCREEN_REGISTRY, getMobileScreenById } from "./src/screen-registry";

const homeScreen = getMobileScreenById("mobile-screen-developer-home");

export default function App() {
  return (
    <View style={styles.shell}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>USF bounded local mobile scaffold</Text>
        <Text style={styles.title}>{homeScreen.screenName}</Text>
        <Text style={styles.body}>
          This local Expo surface renders governed screen metadata only. Product behaviour remains owned by USF semantic artefacts.
        </Text>
        <View style={styles.card}>
          <Text style={styles.label}>Capability</Text>
          <Text style={styles.value}>{homeScreen.capabilityId}</Text>
          <Text style={styles.label}>Permission</Text>
          <Text style={styles.value}>{homeScreen.permissionRefs.join(", ")}</Text>
          <Text style={styles.label}>Unknown screen policy</Text>
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
