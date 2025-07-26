// src/screens/DashboardScreen.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Alert,
  Dimensions,
  Platform,
  Image
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Task, DateType } from '../models/Task';
import { Timestamp } from 'firebase/firestore';
import TaskService from '../services/TaskService';
import UserPreferencesService from '../services/UserPreferencesService';
import ScheduleService from '../services/ScheduleService';
import TaskItem from '../components/TaskItem';
import FilterBar from '../components/FilterBar';
import EmptyTaskList from '../components/EmptyTaskList';
import { 
  backgroundColors, 
  textColors, 
  primaryColors
} from '../utils/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { toDate } from '../utils/dateUtils';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUser } from '../context/UserContext';

type FilterType = 'all' | 'today' | 'week' | 'month';

type DashboardScreenProps = {
  navigation: StackNavigationProp<any>;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  // Get current user ID from context
  const { userId } = useUser();

  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [groupedTasks, setGroupedTasks] = useState<{[key: string]: Task[]}>({});
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scheduleAvailable, setScheduleAvailable] = useState(false);
  const [todayStats, setTodayStats] = useState({
    total: 0,
    completed: 0,
    urgent: 0
  });
  
  // Load tasks on initial render and when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadTasks();
      checkScheduleAvailability();
      return () => {}; // Cleanup function
    }, [])
  );
  
  // Effect to filter tasks when tasks or filter changes
  useEffect(() => {
    filterTasks(activeFilter);
  }, [tasks, activeFilter]);
  
  // Load tasks from database
  const loadTasks = async () => {
    try {
      setLoading(true);
      // Use current user ID instead of hardcoded ID
      const userTasks = await TaskService.getUserTasks(userId || null);
      setTasks(userTasks);
      
      // Calculate today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Count today's tasks
      const todayTasks = userTasks.filter(task => {
        const taskDate = toDate(task.deadline);
        return taskDate >= today && taskDate < tomorrow;
      });
      
      // Count completed tasks today
      const completedTasks = await TaskService.getCompletedTasksForDate(userId || null, today);
      
      // Count urgent tasks (urgency >= 4)
      const urgentTasks = todayTasks.filter(task => task.urgency >= 4);
      
      setTodayStats({
        total: todayTasks.length,
        completed: completedTasks.length,
        urgent: urgentTasks.length
      });
    } catch (error) {
      console.error('Error loading tasks:', error);
      Alert.alert('Error', 'Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Check if a schedule is available for today
  const checkScheduleAvailability = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Use current user ID instead of hardcoded ID
      const schedules = await ScheduleService.getSchedulesForDate(userId || null, today);
      
      setScheduleAvailable(schedules.length > 0);
    } catch (error) {
      console.error('Error checking schedule availability:', error);
    }
  };
  
// Filter tasks based on selected filter
const filterTasks = (filterType: FilterType) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Start of today
  
  let filtered: Task[];
  
  switch (filterType) {
    case 'today':
      // Tasks due today
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      
      filtered = tasks.filter(task => {
        if (task.deadline === null) {
          // Exclude tasks with no deadline from "today" view
          return false;
        }
        const taskDeadline = toDate(task.deadline);
        return taskDeadline && taskDeadline >= now && taskDeadline <= endOfDay;
      });
      break;
    
    case 'week':
      // Tasks due within the next 7 days
      const endOfWeek = new Date(now);
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      
      filtered = tasks.filter(task => {
        if (task.deadline === null) {
          // Exclude tasks with no deadline from "week" view
          return false;
        }
        const taskDeadline = toDate(task.deadline);
        return taskDeadline && taskDeadline >= now && taskDeadline <= endOfWeek;
      });
      break;
    
    case 'month':
      // Tasks due within the next 30 days
      const endOfMonth = new Date(now);
      endOfMonth.setDate(endOfMonth.getDate() + 30);
      
      filtered = tasks.filter(task => {
        if (task.deadline === null) {
          // Exclude tasks with no deadline from "month" view
          return false;
        }
        const taskDeadline = toDate(task.deadline);
        return taskDeadline && taskDeadline >= now && taskDeadline <= endOfMonth;
      });
      break;
    
    case 'all':
    default:
      filtered = [...tasks];
      break;
  }
  
  // Sort tasks:
  // 1. Tasks with no deadline first
  // 2. Then by deadline (ascending)
  // 3. Then by urgency (descending)
  filtered.sort((a, b) => {
    // If a has no deadline and b has a deadline, a comes first
    if (a.deadline === null && b.deadline !== null) return -1;
    // If b has no deadline and a has a deadline, b comes first
    if (b.deadline === null && a.deadline !== null) return 1;
    // If both have no deadline, sort by urgency (higher first)
    if (a.deadline === null && b.deadline === null) return b.urgency - a.urgency;
    
    // Both have deadlines, convert to Date
    const deadlineA = toDate(a.deadline);
    const deadlineB = toDate(b.deadline);
    
    // Handle case where conversion failed
    if (!deadlineA && !deadlineB) return 0;
    if (!deadlineA) return 1;
    if (!deadlineB) return -1;
    
    if (deadlineA.getTime() === deadlineB.getTime()) {
      // If same deadline, sort by urgency (higher first)
      return b.urgency - a.urgency;
    }
    
    return deadlineA.getTime() - deadlineB.getTime();
  });
  
  setFilteredTasks(filtered);
  
  // Group tasks by date
  const grouped: {[key: string]: Task[]} = {};
  
  // Add a special group for tasks with no deadline
  const noDeadlineTasks = filtered.filter(task => task.deadline === null);
  if (noDeadlineTasks.length > 0) {
    grouped['No Deadline'] = noDeadlineTasks;
  }
  
  // Group the rest by date
  filtered
    .filter(task => task.deadline !== null)
    .forEach(task => {
      const dateString = formatRelativeDate(task.deadline);
      if (!grouped[dateString]) {
        grouped[dateString] = [];
      }
      grouped[dateString].push(task);
    });
  
  setGroupedTasks(grouped);
};
  
  // Handle filter change
  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        .catch(error => console.warn('Haptics error:', error));
    }
  };
  
  // Format date as relative (today, tomorrow, or MM/DD/YYYY)
  const formatRelativeDate = (date: DateType): string => {
    // Convert to Date first
    const jsDate = toDate(date);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dateTime = jsDate.getTime();
    const todayTime = today.getTime();
    const tomorrowTime = tomorrow.getTime();

    if (dateTime >= todayTime && dateTime < tomorrowTime) {
      return 'Today';
    } else if (dateTime >= tomorrowTime && dateTime < tomorrowTime + 86400000) {
      return 'Tomorrow';
    } else {
      return `${jsDate.getMonth() + 1}/${jsDate.getDate()}/${jsDate.getFullYear()}`;
    }
  };
  
  // Navigate to add task screen
  const navigateToAddTask = () => {
    navigation.navigate('AddTask');
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        .catch(error => console.warn('Haptics error:', error));
    }
  };
  
  // Navigate to view schedules screen
  const navigateToSchedules = () => {
    // Changed: Navigate to FreeTimeInput screen instead of Schedules
    navigation.navigate('FreeTimeInput');
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        .catch(error => console.warn('Haptics error:', error));
    }
  };
  
  // Navigate to settings screen
  const navigateToSettings = () => {
    navigation.navigate('Settings');
  };
  
  // Generate schedules (alternative to navigateToSchedules)
  const generateSchedules = async () => {
    try {
      setLoading(true);
      
      // Changed: Navigate to FreeTimeInput screen instead of directly generating
      navigation.navigate('FreeTimeInput');
      
    } catch (error) {
      console.error('Error navigating to free time input:', error);
      Alert.alert('Error', 'Failed to open scheduling. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
  };
  
  // Handle task completion
  const handleTaskComplete = async (taskId: string) => {
    try {
      await TaskService.completeTask(taskId);
      
      // Haptic feedback
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          .catch(error => console.warn('Haptics error:', error));
      }
      
      // Update task list
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      
      // Update stats
      setTodayStats(prev => ({
        ...prev,
        completed: prev.completed + 1
      }));
    } catch (error) {
      console.error('Error completing task:', error);
      Alert.alert('Error', 'Failed to complete task. Please try again.');
    }
  };
  
  // Start focus timer for a task
  const handleStartFocus = (task: Task) => {
    navigation.navigate('FocusTimer', {
      taskId: task.id,
      duration: task.durationMinutes
    });
  };

  // Render a section header for a date group
  const renderSectionHeader = (dateString: string, tasks: Task[]) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderContent}>
        <Text style={styles.dateHeader}>{dateString}</Text>
        <Text style={styles.taskCount}>{tasks.length} task{tasks.length !== 1 ? 's' : ''}</Text>
      </View>
      <View style={styles.dateDivider} />
    </View>
  );
  
  // Render the progress indicator
  const renderProgressIndicator = useMemo(() => {
    const percentage = todayStats.total === 0 
      ? 100 
      : Math.round((todayStats.completed / (todayStats.total + todayStats.completed)) * 100);
    
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeaderRow}>
          <Text style={styles.progressTitle}>Today's Progress</Text>
          <Text style={styles.progressPercentage}>{percentage}%</Text>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { width: `${percentage}%` }
            ]} 
          />
        </View>
        
        <View style={styles.progressStatsRow}>
          <View style={styles.progressStat}>
            <Text style={styles.progressStatValue}>{todayStats.total}</Text>
            <Text style={styles.progressStatLabel}>Pending</Text>
          </View>
          
          <View style={styles.progressStat}>
            <Text style={styles.progressStatValue}>{todayStats.completed}</Text>
            <Text style={styles.progressStatLabel}>Completed</Text>
          </View>
          
          <View style={styles.progressStat}>
            <Text style={[
              styles.progressStatValue,
              todayStats.urgent > 0 ? styles.urgentValue : null
            ]}>
              {todayStats.urgent}
            </Text>
            <Text style={styles.progressStatLabel}>Urgent</Text>
          </View>
        </View>
      </View>
    );
  }, [todayStats]);
  
  // Render empty state
  const renderEmptyState = () => (
    <EmptyTaskList filter={activeFilter} />
  );
  
  // Main render
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColors.light} />
      
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image source={require('../../assets/splash-icon.png')} style={{ width: 36, height: 36, marginRight: 8 }} />
              <Text style={styles.headerTitle}>BrainBuddy</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              {new Date().toLocaleDateString(undefined, { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
          </View>
          
          <View style={styles.headerButtons}>
            {scheduleAvailable ? (
              <TouchableOpacity 
                style={styles.scheduleButton} 
                onPress={navigateToSchedules}
                accessibilityLabel="View today's schedule"
              >
                <MaterialCommunityIcons 
                  name="calendar-clock" 
                  size={24} 
                  color={primaryColors.primary} 
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.scheduleButton} 
                onPress={generateSchedules}
                accessibilityLabel="Generate schedule options"
              >
                <MaterialCommunityIcons 
                  name="calendar-plus" 
                  size={24} 
                  color={primaryColors.primary} 
                />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.settingsButton} 
              onPress={navigateToSettings}
              accessibilityLabel="Settings"
            >
              <Ionicons 
                name="settings-outline" 
                size={24} 
                color={textColors.tertiary} 
              />
            </TouchableOpacity>
          </View>
        </View>
        
        {!loading && renderProgressIndicator}
        
        <FilterBar
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          filters={[
            { key: 'all', label: 'All Tasks', icon: 'list-outline' },
            { key: 'today', label: 'Today', icon: 'sunny-outline' },
            { key: 'week', label: 'This Week', icon: 'calendar-outline' },
            { key: 'month', label: 'This Month', icon: 'calendar' },
          ]}
        />
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={primaryColors.primary} />
          </View>
        ) : filteredTasks.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={Object.keys(groupedTasks)}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.listContent}
            renderItem={({ item: dateString }) => (
              <View>
                {renderSectionHeader(dateString, groupedTasks[dateString])}
                {groupedTasks[dateString].map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onComplete={() => handleTaskComplete(task.id)}
                    onPress={() => navigation.navigate('TaskDetails', { taskId: task.id })}
                    onFocus={() => handleStartFocus(task)}
                  />
                ))}
              </View>
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[primaryColors.primary]}
                tintColor={primaryColors.primary}
              />
            }
          />
        )}
        
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={navigateToAddTask}
          activeOpacity={0.8}
          accessibilityLabel="Add new task"
        >
          <LinearGradient
            colors={['#4c669f', '#3b5998', '#192f6a']}
            style={styles.gradientButton}
          >
            <AntDesign name="plus" size={24} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: backgroundColors.light,
  },
  container: {
    flex: 1,
    backgroundColor: backgroundColors.light,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitleSection: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: textColors.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: textColors.tertiary,
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: backgroundColors.lighter,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: backgroundColors.lighter,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  progressContainer: {
    backgroundColor: backgroundColors.lighter,
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: textColors.primary,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: primaryColors.primary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: primaryColors.secondary,
    borderRadius: 4,
  },
  progressStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStat: {
    alignItems: 'center',
    flex: 1,
  },
  progressStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: textColors.primary,
  },
  urgentValue: {
    color: primaryColors.danger,
  },
  progressStatLabel: {
    fontSize: 12,
    color: textColors.tertiary,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Extra padding for floating button
  },
  sectionHeader: {
    marginTop: 10,
    marginBottom: 5,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: textColors.primary,
  },
  taskCount: {
    fontSize: 14,
    color: textColors.tertiary,
  },
  dateDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginTop: 8,
    marginBottom: 5,
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  gradientButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DashboardScreen;