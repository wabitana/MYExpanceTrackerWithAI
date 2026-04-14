import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Expense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  timestamp: number;
};

const CATEGORIES = [
  { name: "Food", icon: "🍕", color: "#FF6B6B" },
  { name: "Transport", icon: "🚕", color: "#4D96FF" },
  { name: "Shopping", icon: "🛍️", color: "#FFD93D" },
  { name: "Tech", icon: "💻", color: "#6BCB77" },
  { name: "Health", icon: "💊", color: "#92A9BD" },
];

export default function SmartExpenseTracker() {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [searchQuery, setSearchQuery] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await AsyncStorage.getItem("@smart_vault");
    if (data) setExpenses(JSON.parse(data));
  };

  const saveData = async (newList: Expense[]) => {
    setExpenses(newList);
    await AsyncStorage.setItem("@smart_vault", JSON.stringify(newList));
  };

  // --- Intelligence: Currency Formatting Helper ---
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(
      (ex) =>
        ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.category.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [expenses, searchQuery]);

  const stats = useMemo(() => {
    const total = expenses.reduce((sum, item) => sum + item.amount, 0);
    const topCategory =
      expenses.length > 0
        ? expenses.reduce((a, b) =>
            expenses.filter((v) => v.category === a.category).length >=
            expenses.filter((v) => v.category === b.category).length
              ? a
              : b,
          ).category
        : "None";
    return { total, topCategory };
  }, [expenses]);

  const addExpense = () => {
    if (!title || !amount)
      return Alert.alert("Required", "Please fill in all fields.");

    const numAmount = parseFloat(amount.replace(/,/g, ""));
    if (isNaN(numAmount))
      return Alert.alert("Error", "Invalid amount entered.");

    const newEx: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      title: title.trim(),
      amount: numAmount,
      category,
      timestamp: Date.now(),
    };
    saveData([newEx, ...expenses]);
    setTitle("");
    setAmount("");
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          stickyHeaderIndices={[0]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollPadding}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </Text>
            <Text style={styles.title}>Smart Wallet</Text>

            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Spent</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(stats.total)}{" "}
                  <Text style={styles.currencyCode}>ETB</Text>
                </Text>
              </View>
              <View
                style={[styles.summaryCard, { backgroundColor: "#1e293b" }]}
              >
                <Text style={styles.summaryLabel}>Top Category</Text>
                <Text style={styles.summaryValue}>{stats.topCategory}</Text>
              </View>
            </View>
          </View>

          {/* Intelligence: Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              placeholder="Search history..."
              placeholderTextColor="#64748b"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Input Card */}
          <View style={styles.glassCard}>
            <Text style={styles.cardTitle}>Add Transaction</Text>
            <View style={styles.inputGroup}>
              <TextInput
                placeholder="Merchant / Item"
                placeholderTextColor="#94a3b8"
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
              />
              <TextInput
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
                style={[styles.textInput, styles.amountInput]}
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.catScroll}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.name}
                  onPress={() => setCategory(cat.name)}
                  style={[
                    styles.catBadge,
                    category === cat.name && { backgroundColor: cat.color },
                  ]}
                >
                  <Text style={styles.catIcon}>{cat.icon}</Text>
                  <Text
                    style={[
                      styles.catText,
                      category === cat.name && { color: "#000" },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.mainBtn} onPress={addExpense}>
              <Text style={styles.mainBtnText}>Confirm Transaction</Text>
            </TouchableOpacity>
          </View>

          {/* List Section */}
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Recent Activity</Text>
            <Text style={styles.listSub}>
              {filteredExpenses.length} entries
            </Text>
          </View>

          {filteredExpenses.map((item) => (
            <View key={item.id} style={styles.expenseRow}>
              <View style={styles.rowLeft}>
                <View style={styles.iconBox}>
                  <Text style={{ fontSize: 18 }}>
                    {CATEGORIES.find((c) => c.name === item.category)?.icon ||
                      "💰"}
                  </Text>
                </View>
                <View>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowMeta}>
                    {new Date(item.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    • {item.category}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onLongPress={() => {
                  Alert.alert("Delete", "Remove this entry?", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () =>
                        saveData(expenses.filter((e) => e.id !== item.id)),
                    },
                  ]);
                }}
              >
                <Text style={styles.rowAmount}>
                  -{formatCurrency(item.amount)}
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          {filteredExpenses.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyMsg}>No transactions found</Text>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#020617" },
  scrollPadding: { paddingBottom: 40 },
  header: { padding: 24, paddingTop: 60, backgroundColor: "#020617" },
  dateText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    color: "#f8fafc",
    fontSize: 34,
    fontWeight: "900",
    marginVertical: 6,
  },
  summaryRow: { flexDirection: "row", gap: 12, marginTop: 15 },
  summaryCard: {
    flex: 1,
    backgroundColor: "#2563eb",
    padding: 20,
    borderRadius: 24,
    elevation: 4,
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "600",
  },
  summaryValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
  },
  currencyCode: { fontSize: 12, opacity: 0.8 },

  searchContainer: { paddingHorizontal: 24, marginBottom: 20 },
  searchInput: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16,
    color: "#fff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },

  glassCard: {
    marginHorizontal: 24,
    padding: 20,
    backgroundColor: "#1e293b",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  cardTitle: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 15,
    textTransform: "uppercase",
  },
  inputGroup: { flexDirection: "row", gap: 10, marginBottom: 15 },
  textInput: {
    flex: 2,
    backgroundColor: "#0f172a",
    borderRadius: 15,
    padding: 15,
    color: "#fff",
    fontSize: 15,
  },
  amountInput: {
    flex: 1.2,
    fontWeight: "bold",
    color: "#60a5fa",
    textAlign: "right",
  },

  catScroll: { marginBottom: 20 },
  catBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: "#0f172a",
  },
  catIcon: { marginRight: 6 },
  catText: { color: "#94a3b8", fontWeight: "700", fontSize: 13 },

  mainBtn: {
    backgroundColor: "#f8fafc",
    padding: 18,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#fff",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  mainBtnText: { color: "#020617", fontWeight: "800", fontSize: 16 },

  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 35,
    marginBottom: 15,
  },
  listTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  listSub: { color: "#64748b", fontWeight: "600" },

  expenseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 24,
    padding: 18,
    backgroundColor: "#0f172a",
    borderRadius: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
  },
  rowTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  rowMeta: { color: "#64748b", fontSize: 12, marginTop: 4 },
  rowAmount: { color: "#f87171", fontWeight: "900", fontSize: 16 },

  emptyContainer: { alignItems: "center", marginTop: 40 },
  emptyMsg: { color: "#475569", fontSize: 16, fontWeight: "600" },
});
