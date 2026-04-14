import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

// --- Configuration ---
type Expense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  timestamp: number;
  type: "expense" | "income";
  note?: string;
};

const CATEGORIES = [
  { name: "Food", icon: "🍕", color: "#FF6B6B" },
  { name: "Transport", icon: "🚕", color: "#4D96FF" },
  { name: "Shopping", icon: "🛍️", color: "#FFD93D" },
  { name: "Home", icon: "🏠", color: "#6BCB77" },
  { name: "Bills", icon: "💳", color: "#a78bfa" },
  { name: "Salary", icon: "💰", color: "#4ade80" },
];

export default function WabiExpenseElite() {
  const [activeTab, setActiveTab] = useState<"track" | "stats" | "settings">(
    "track",
  );
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showEntryCard, setShowEntryCard] = useState(false);

  // Settings
  const [dailyLimit, setDailyLimit] = useState(1000);
  const [monthlyLimit, setMonthlyLimit] = useState(30000);
  const [currency, setCurrency] = useState("ETB");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [search, setSearch] = useState("");

  // Animations
  const bgAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgAnim, {
          toValue: 1,
          duration: 15000,
          useNativeDriver: false,
        }),
        Animated.timing(bgAnim, {
          toValue: 0,
          duration: 15000,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, []);

  const toggleEntryCard = (show: boolean) => {
    if (show) {
      setShowEntryCard(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setShowEntryCard(false));
    }
  };

  const loadData = async () => {
    const data = await AsyncStorage.getItem("@wabi_v3");
    const savedTheme = await AsyncStorage.getItem("@wabi_theme");
    if (data) setExpenses(JSON.parse(data));
    if (savedTheme) setTheme(savedTheme as any);
  };

  const saveData = async (newList: Expense[]) => {
    setExpenses(newList);
    await AsyncStorage.setItem("@wabi_v3", JSON.stringify(newList));
  };

  const saveTheme = async (newTheme: "dark" | "light") => {
    setTheme(newTheme);
    await AsyncStorage.setItem("@wabi_theme", newTheme);
  };

  // --- Theme Colors ---
  const isDark = theme === "dark";
  const colors = {
    bg: isDark ? "transparent" : "#f8fafc",
    card: isDark ? "rgba(255,255,255,0.06)" : "#ffffff",
    text: isDark ? "#ffffff" : "#0f172a",
    subText: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0",
    input: isDark ? "rgba(0,0,0,0.2)" : "#f1f5f9",
    navBg: isDark ? "rgba(0,0,0,0.3)" : "#e2e8f0",
  };

  // --- Intelligence Engine ---
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();

    const spentToday = expenses
      .filter(
        (e) =>
          e.type === "expense" &&
          new Date(e.timestamp).toDateString() === todayStr,
      )
      .reduce((s, i) => s + i.amount, 0);
    const spentMonth = expenses
      .filter(
        (e) =>
          e.type === "expense" &&
          new Date(e.timestamp).getMonth() === now.getMonth(),
      )
      .reduce((s, i) => s + i.amount, 0);
    const totalIncome = expenses
      .filter((e) => e.type === "income")
      .reduce((s, i) => s + i.amount, 0);
    const totalExpense = expenses
      .filter((e) => e.type === "expense")
      .reduce((s, i) => s + i.amount, 0);

    const ratio = totalExpense / (totalIncome || 1);
    const healthScore = Math.max(0, Math.min(100, 100 - ratio * 100));

    const counts: any = {};
    expenses.forEach(
      (e) => (counts[e.category] = (counts[e.category] || 0) + 1),
    );
    const topHabit = Object.keys(counts).reduce(
      (a, b) => (counts[a] > counts[b] ? a : b),
      "None",
    );

    return {
      spentToday,
      spentMonth,
      balance: totalIncome - totalExpense,
      healthScore,
      topHabit,
      burnRate: spentToday / (dailyLimit || 1),
    };
  }, [expenses, dailyLimit]);

  const filteredExpenses = expenses.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()),
  );

  // --- CRUD Functions ---
  const handleAddOrUpdate = () => {
    if (!title || !amount)
      return Alert.alert("Required", "Please enter merchant and amount.");
    const numAmount = parseFloat(amount.replace(/,/g, ""));

    if (editingId) {
      const updated = expenses.map((e) =>
        e.id === editingId
          ? { ...e, title, amount: numAmount, category, type }
          : e,
      );
      saveData(updated);
    } else {
      const newEx: Expense = {
        id: Date.now().toString(),
        title,
        amount: numAmount,
        category,
        type,
        timestamp: Date.now(),
      };
      saveData([newEx, ...expenses]);
    }
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setAmount("");
    setType("expense");
    toggleEntryCard(false);
  };

  const startEdit = (item: Expense) => {
    setEditingId(item.id);
    setTitle(item.title);
    setAmount(item.amount.toString());
    setCategory(item.category);
    setType(item.type);
    toggleEntryCard(true);
  };

  const exportCSV = () => {
    const csv = expenses
      .map(
        (e) =>
          `${new Date(e.timestamp).toLocaleDateString()},${e.title},${e.amount},${e.category}`,
      )
      .join("\n");
    Share.share({
      message: `WabiExpense Report:\nDate,Merchant,Amount,Category\n${csv}`,
    });
  };

  const formatNum = (num: number) =>
    new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(num);

  const bgColor = bgAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: isDark
      ? ["#020617", "#1e1b4b", "#0f172a"]
      : ["#f8fafc", "#f8fafc", "#f8fafc"],
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Dynamic Dashboard */}
      <View style={styles.header}>
        <View style={styles.topRow}>
          <Text style={[styles.appName, { color: colors.text }]}>
            Wabi<Text style={styles.blueText}>Expense</Text>
          </Text>
          <TouchableOpacity onPress={() => setActiveTab("settings")}>
            <Text style={styles.gearIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.mainCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.mainLabel, { color: colors.subText }]}>
            Available Balance
          </Text>
          <Text style={[styles.mainAmount, { color: colors.text }]}>
            {formatNum(stats.balance)}{" "}
            <Text style={styles.curText}>{currency}</Text>
          </Text>

          <View style={styles.miniStats}>
            <View>
              <Text style={styles.miniLabel}>Daily Burn</Text>
              <Text style={[styles.miniVal, { color: colors.text }]}>
                {(stats.burnRate * 100).toFixed(0)}%
              </Text>
            </View>
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <View>
              <Text style={styles.miniLabel}>Health Score</Text>
              <Text style={[styles.miniVal, { color: "#4ade80" }]}>
                {stats.healthScore.toFixed(0)}
              </Text>
            </View>
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <View>
              <Text style={styles.miniLabel}>Top Habit</Text>
              <Text style={[styles.miniVal, { color: colors.text }]}>
                {stats.topHabit}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Navigation */}
      <View style={[styles.navBar, { backgroundColor: colors.navBg }]}>
        {["track", "stats", "settings"].map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setActiveTab(t as any)}
            style={[styles.navItem, activeTab === t && styles.activeNav]}
          >
            <Text
              style={[styles.navText, activeTab === t && styles.activeNavText]}
            >
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {activeTab === "track" && (
          <View>
            {/* Entry Card with Fade Animation */}
            {showEntryCard && (
              <Animated.View
                style={[
                  styles.entryPanel,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: fadeAnim,
                    transform: [
                      {
                        scale: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.95, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.typeToggle}>
                  <TouchableOpacity
                    onPress={() => setType("expense")}
                    style={[
                      styles.tBtn,
                      type === "expense" && { backgroundColor: "#ef4444" },
                    ]}
                  >
                    <Text style={styles.tText}>Expense</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setType("income")}
                    style={[
                      styles.tBtn,
                      type === "income" && { backgroundColor: "#22c55e" },
                    ]}
                  >
                    <Text style={styles.tText}>Income</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  placeholder="Merchant/Source"
                  placeholderTextColor={colors.subText}
                  style={[
                    styles.input,
                    { backgroundColor: colors.input, color: colors.text },
                  ]}
                  value={title}
                  onChangeText={setTitle}
                />
                <TextInput
                  placeholder="0.00"
                  placeholderTextColor={colors.subText}
                  keyboardType="decimal-pad"
                  style={[
                    styles.input,
                    styles.amountInput,
                    { backgroundColor: colors.input },
                  ]}
                  value={amount}
                  onChangeText={setAmount}
                />

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.catScroll}
                >
                  {CATEGORIES.map((c) => (
                    <TouchableOpacity
                      key={c.name}
                      onPress={() => setCategory(c.name)}
                      style={[
                        styles.catChip,
                        category === c.name && { backgroundColor: c.color },
                      ]}
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          category === c.name && { color: "#000" },
                        ]}
                      >
                        {c.icon} {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={[
                      styles.confirmBtn,
                      { backgroundColor: isDark ? "#fff" : "#2563eb" },
                    ]}
                    onPress={handleAddOrUpdate}
                  >
                    <Text
                      style={[
                        styles.confirmText,
                        { color: isDark ? "#000" : "#fff" },
                      ]}
                    >
                      {editingId ? "Update" : "Add Transaction"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.cancelBtn,
                      { backgroundColor: colors.input },
                    ]}
                    onPress={resetForm}
                  >
                    <Text style={[styles.cancelText, { color: colors.text }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            <View style={styles.listHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Activity
              </Text>
              {!showEntryCard && (
                <TouchableOpacity
                  onPress={() => toggleEntryCard(true)}
                  style={[
                    styles.fabInline,
                    { backgroundColor: isDark ? "#fff" : "#2563eb" },
                  ]}
                >
                  <Text
                    style={[
                      styles.fabText,
                      { color: isDark ? "#000" : "#fff" },
                    ]}
                  >
                    + New
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              placeholder="Search transactions..."
              placeholderTextColor={colors.subText}
              style={[
                styles.searchBar,
                { backgroundColor: colors.card, color: colors.text },
              ]}
              value={search}
              onChangeText={setSearch}
            />

            {filteredExpenses.map((item) => (
              <ScrollView
                key={item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={width * 0.2}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.item, { backgroundColor: colors.card }]}
                  onLongPress={() => startEdit(item)}
                >
                  <View
                    style={[styles.iconBox, { backgroundColor: colors.input }]}
                  >
                    <Text style={{ fontSize: 20 }}>
                      {CATEGORIES.find((c) => c.name === item.category)?.icon}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.itemDate, { color: colors.subText }]}>
                      {new Date(item.timestamp).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.itemAmt,
                      { color: item.type === "income" ? "#22c55e" : "#f87171" },
                    ]}
                  >
                    {item.type === "income" ? "+" : "-"}
                    {formatNum(item.amount)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.delBtn}
                  onPress={() =>
                    saveData(expenses.filter((e) => e.id !== item.id))
                  }
                >
                  <Text style={{ fontSize: 20 }}>🗑️</Text>
                </TouchableOpacity>
              </ScrollView>
            ))}
          </View>
        )}

        {activeTab === "stats" && (
          <View style={styles.padded}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Financial Analysis
            </Text>
            <StatCard
              label="Daily Budget"
              current={stats.spentToday}
              limit={dailyLimit}
              color="#3b82f6"
              textColor={colors.text}
              subTextColor={colors.subText}
              cardColor={colors.card}
            />
            <StatCard
              label="Monthly Budget"
              current={stats.spentMonth}
              limit={monthlyLimit}
              color="#a78bfa"
              textColor={colors.text}
              subTextColor={colors.subText}
              cardColor={colors.card}
            />

            <View
              style={[styles.intensityCard, { backgroundColor: colors.card }]}
            >
              <Text style={[styles.intensityTitle, { color: colors.text }]}>
                Spending Intensity (Last 7)
              </Text>
              <View style={styles.chart}>
                {expenses.slice(0, 7).map((e, i) => (
                  <View
                    key={i}
                    style={[
                      styles.bar,
                      {
                        height: Math.min((e.amount / dailyLimit) * 100, 100),
                        backgroundColor: isDark ? "#1e293b" : "#e2e8f0",
                        borderTopColor: "#3b82f6",
                        borderTopWidth: 2,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: colors.card }]}
              onPress={exportCSV}
            >
              <Text style={styles.exportBtnText}>Export to CSV (Excel)</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === "settings" && (
          <View style={styles.padded}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Planner Settings
            </Text>

            <View style={[styles.glassCard, { backgroundColor: colors.card }]}>
              {/* Theme Selector */}
              <Text style={styles.setLabel}>Appearance</Text>
              <View style={[styles.btnRow, { marginBottom: 20 }]}>
                {["dark", "light"].map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => saveTheme(t as any)}
                    style={[
                      styles.curBtn,
                      theme === t && { backgroundColor: "#2563eb" },
                      {
                        backgroundColor: theme === t ? "#2563eb" : colors.input,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tText,
                        { color: theme === t ? "#fff" : colors.text },
                      ]}
                    >
                      {t === "dark" ? "🌙 Dark" : "☀️ Light"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.setLabel}>Daily Limit ({currency})</Text>
              <TextInput
                style={[
                  styles.setInput,
                  { backgroundColor: colors.input, color: colors.text },
                ]}
                keyboardType="numeric"
                value={dailyLimit.toString()}
                onChangeText={(v) => setDailyLimit(Number(v))}
              />
              <Text style={styles.setLabel}>Monthly Limit ({currency})</Text>
              <TextInput
                style={[
                  styles.setInput,
                  { backgroundColor: colors.input, color: colors.text },
                ]}
                keyboardType="numeric"
                value={monthlyLimit.toString()}
                onChangeText={(v) => setMonthlyLimit(Number(v))}
              />
              <Text style={styles.setLabel}>Preferred Currency</Text>
              <View style={styles.btnRow}>
                {["ETB", "USD", "EUR"].map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCurrency(c)}
                    style={[
                      styles.curBtn,
                      currency === c && { backgroundColor: "#2563eb" },
                      {
                        backgroundColor:
                          currency === c ? "#2563eb" : colors.input,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tText,
                        { color: currency === c ? "#fff" : colors.text },
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const StatCard = ({
  label,
  current,
  limit,
  color,
  textColor,
  subTextColor,
  cardColor,
}: any) => (
  <View style={[styles.statCard, { backgroundColor: cardColor }]}>
    <View style={styles.statHeader}>
      <Text style={[styles.statLabel, { color: subTextColor }]}>{label}</Text>
      <Text style={[styles.statValue, { color: textColor }]}>
        {current.toFixed(0)} / {limit}
      </Text>
    </View>
    <View style={styles.progressContainer}>
      <View
        style={[
          styles.progressFill,
          {
            width: `${Math.min((current / limit) * 100, 100)}%`,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  appName: { fontSize: 26, fontWeight: "900" },
  blueText: { color: "#3b82f6" },
  gearIcon: { fontSize: 24 },
  mainCard: {
    borderRadius: 32,
    padding: 25,
    borderWidth: 1,
  },
  mainLabel: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  mainAmount: { fontSize: 36, fontWeight: "900", marginTop: 5 },
  curText: { fontSize: 18, color: "#3b82f6" },
  miniStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 25,
    alignItems: "center",
  },
  miniLabel: { color: "#64748b", fontSize: 10, fontWeight: "bold" },
  miniVal: { fontSize: 14, fontWeight: "800", marginTop: 2 },
  divider: { width: 1, height: 20 },

  navBar: {
    flexDirection: "row",
    margin: 20,
    borderRadius: 20,
    padding: 5,
  },
  navItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 15,
  },
  activeNav: { backgroundColor: "#2563eb" },
  navText: { color: "#475569", fontSize: 11, fontWeight: "900" },
  activeNavText: { color: "#fff" },

  scroll: { paddingBottom: 100 },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 20, fontWeight: "900" },
  fabInline: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 12,
  },
  fabText: { fontWeight: "bold" },
  searchBar: {
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },

  entryPanel: {
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    marginBottom: 25,
  },
  typeToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 15,
  },
  tBtn: { flex: 1, padding: 10, alignItems: "center", borderRadius: 10 },
  tText: { fontWeight: "bold", fontSize: 12 },
  input: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
  },
  amountInput: { fontSize: 24, fontWeight: "bold", color: "#60a5fa" },
  catScroll: { marginBottom: 20 },
  catChip: {
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    marginRight: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  catChipText: { fontSize: 12, fontWeight: "bold" },
  btnRow: { flexDirection: "row", gap: 10 },
  confirmBtn: {
    flex: 2,
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
  },
  confirmText: { fontWeight: "bold" },
  cancelBtn: {
    flex: 1,
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
  },
  cancelText: { fontWeight: "500" },

  item: {
    width: width - 40,
    marginHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 24,
    marginBottom: 12,
  },
  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  itemTitle: { fontSize: 16, fontWeight: "700" },
  itemDate: { fontSize: 12 },
  itemAmt: { fontSize: 16, fontWeight: "900" },
  delBtn: {
    backgroundColor: "#ef4444",
    width: 70,
    height: 78,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },

  padded: { paddingHorizontal: 20 },
  statCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 15,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statLabel: { fontWeight: "bold" },
  statValue: { fontSize: 12 },
  progressContainer: {
    height: 8,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%" },
  intensityCard: {
    padding: 20,
    borderRadius: 24,
    marginTop: 10,
  },
  intensityTitle: { fontWeight: "bold", marginBottom: 20 },
  chart: { flexDirection: "row", alignItems: "flex-end", height: 100, gap: 10 },
  bar: { flex: 1, borderRadius: 4 },
  exportBtn: {
    marginTop: 20,
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
  },
  exportBtnText: { color: "#3b82f6", fontWeight: "bold" },

  glassCard: {
    padding: 20,
    borderRadius: 24,
  },
  setLabel: {
    color: "#64748b",
    fontSize: 12,
    marginBottom: 8,
    fontWeight: "bold",
  },
  setInput: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    fontSize: 18,
    fontWeight: "bold",
  },
  curBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
});
