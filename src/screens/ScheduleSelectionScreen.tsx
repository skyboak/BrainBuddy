// src/screens/ScheduleSelectionScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import ScheduleService from '../services/ScheduleService';
import TaskService from '../services/TaskService';
import NotificationService from '../services/NotificationService';
import { ScheduleOption, ScheduledTask, Task, DateType } from '../models/Task';
import { Timestamp, FieldValue } from 'firebase/firestore';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '../context/UserContext';

// Type guards
function isTimestamp(value: any): value is Timestamp {
  return value && typeof value.toDate === 'function';
}

function isDate(value: any): value is Date {
  return value instanceof Date;
}

// Safely convert DateType to Date
function convertToDate(date: DateType): Date {
  if (isDate(date)) return date;
  if (isTimestamp(date)) return date.toDate();
  return new Date();
}

const ScheduleSelectionScreen = ({ navigation, route }) => {
  // Get current user ID from context
  const { userId } = useUser();
  
  // State
  const [scheduleOptions, setScheduleOptions] = useState<ScheduleOption[]>([]);
  const [tasks, setTasks] = useState<Record<string, Task>>({});
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  
  // Screen width for chart
  const screenWidth = Dimensions.get('window').width;
  
  // Load schedule options on component mount
  useEffect(() => {
    loadScheduleOptions();
  }, []);
  
  // Load schedule options and related tasks
  const loadScheduleOptions = async () => {
    try {
      setLoading(true);
      
      // Get the free time minutes from the route params
      const freeTimeMinutes = route.params?.freeTimeMinutes || 60; // Default to 60 if not provided
      
      // Get current time as the start time
      const now = new Date();
      
      // Get user's tasks using current user ID
      const userTasks = await TaskService.getUserTasks(userId || null);
      
      // Get user preferences using current user ID
      const userPrefs = await ScheduleService.getUserPreferences(userId || null);
      
      // Generate schedule options with current time and free time minutes
      const options = await ScheduleService.generateScheduleOptions(
        userTasks, 
        userPrefs,
        now,
        freeTimeMinutes
      );
      
      // Get tasks details for all schedule options
      const tasksMap: Record<string, Task> = {};
      const taskIds = new Set<string>();
      
      // Collect all task IDs from all schedule options
      options.forEach(option => {
        option.tasks.forEach(scheduledTask => {
          taskIds.add(scheduledTask.taskId);
        });
      });
      
      // Get task details for each task ID
      await Promise.all(Array.from(taskIds).map(async (taskId) => {
        const task = await TaskService.getTaskById(taskId);
        if (task) {
          tasksMap[taskId] = task;
        }
      }));
      
      setScheduleOptions(options);
      setTasks(tasksMap);
      
      // If a schedule is already selected, set selectedOption
      const selectedSchedule = options.findIndex(option => option.selected);
      if (selectedSchedule !== -1) {
        setSelectedOption(selectedSchedule);
      }
    } catch (error) {
      console.error('Error loading schedule options:', error);
      Alert.alert('Error', 'Failed to load schedule options. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle schedule selection
  const handleSelectSchedule = async (index: number) => {
    try {
      // Update selected state locally first
      setSelectedOption(index);
      
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Update in database
      await ScheduleService.selectSchedule(scheduleOptions[index].id);
      
      // Schedule notifications for selected tasks
      await NotificationService.scheduleNotificationsForTasks(scheduleOptions[index].tasks);
      
      // Update the UI
      setScheduleOptions(prevOptions => 
        prevOptions.map((option, i) => ({
          ...option,
          selected: i === index
        }))
      );
      
      // Navigate to focus session instead of dashboard
      navigation.navigate('FocusSession', { scheduleId: scheduleOptions[index].id });
    } catch (error) {
      console.error('Error selecting schedule:', error);
      Alert.alert('Error', 'Failed to select schedule. Please try again.');
    }
  };
  
  // Calculate total duration for a schedule option
  const calculateTotalDuration = (scheduledTasks: ScheduledTask[]): number => {
    return scheduledTasks.reduce((total, scheduledTask) => {
      const task = tasks[scheduledTask.taskId];
      return task ? total + task.durationMinutes : total;
    }, 0);
  };
  
  // Calculate average task difficulty for a schedule option
  const calculateAverageDifficulty = (scheduledTasks: ScheduledTask[]): number => {
    if (scheduledTasks.length === 0) return 0;
    
    const totalDifficulty = scheduledTasks.reduce((total, scheduledTask) => {
      const task = tasks[scheduledTask.taskId];
      return task ? total + task.difficulty : total;
    }, 0);
    
    return totalDifficulty / scheduledTasks.length;
  };
  
  // Format time for display
  const formatTime = (date: DateType): string => {
    // Convert to Date first
    const jsDate = convertToDate(date);
    return format(jsDate, 'h:mm a');
  };
  
  // Determine the option label based on the strategy
  const getOptionLabel = (index: number): string => {
    switch (index) {
      case 0:
        return 'Priority Focus';
      case 1:
        return 'Balanced';
      case 2:
        return 'Grouped Tasks';
      default:
        return `Option ${index + 1}`;
    }
  };
  
  // Determine option description
  const getOptionDescription = (index: number): string => {
    switch (index) {
      case 0:
        return 'Tackles high-priority tasks first';
      case 1:
        return 'Balances different task categories';
      case 2:
        return 'Groups similar tasks for better focus';
      default:
        return '';
    }
  };
  
  // Render a task within a schedule option
  const renderTask = (scheduledTask: ScheduledTask, index: number) => {
    const task = tasks[scheduledTask.taskId];
    
    if (!task) return null;
    
    // Determine icon based on tags or defaults
    let iconName = 'checkbox-outline';
    
    if (task.tags.includes('work')) {
      iconName = 'briefcase-outline';
    } else if (task.tags.includes('home')) {
      iconName = 'home-outline';
    } else if (task.tags.includes('study')) {
      iconName = 'book-outline';
    } else if (task.tags.includes('health')) {
      iconName = 'fitness-outline';
    }
    
    return (
      <View key={`${scheduledTask.taskId}-${index}`} style={styles.taskItem}>
        <View style={styles.taskTimeContainer}>
          <Text style={styles.taskTime}>
            {formatTime(scheduledTask.startTime)}
          </Text>
        </View>
        
        <View style={styles.taskIconContainer}>
          <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={20} color="#007AFF" />
        </View>
        
        <View style={styles.taskDetails}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <Text style={styles.taskDuration}>{task.durationMinutes} mins</Text>
        </View>
        
        <View style={styles.difficultyIndicator}>
          {Array.from({ length: task.difficulty }).map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.difficultyDot, 
                { backgroundColor: i < task.difficulty ? '#007AFF' : '#D1D1D6' }
              ]} 
            />
          ))}
        </View>
      </View>
    );
  };
  
  // Render a schedule option
  const renderScheduleOption = (option: ScheduleOption, index: number) => {
    const totalDuration = calculateTotalDuration(option.tasks);
    const averageDifficulty = calculateAverageDifficulty(option.tasks);
    const isSelected = selectedOption === index;
    
    // Background images for different schedule types
    const backgroundImages = [
      require('../../assets/images/schedule-bg-1.png'),
      require('../../assets/images/schedule-bg-2.png'),
      require('../../assets/images/schedule-bg-3.png'),
    ];
    
    return (
      <View key={option.id} style={styles.optionContainer}>
        <View style={styles.optionHeader}>
          <Image 
            source={backgroundImages[index % backgroundImages.length]} 
            style={styles.optionBackground}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)']}
            style={styles.optionGradient}
          />
          <View style={styles.optionHeaderContent}>
            <Text style={styles.optionTitle}>{getOptionLabel(index)}</Text>
            <Text style={styles.optionSubtitle}>{getOptionDescription(index)}</Text>
            <View style={styles.optionStats}>
              <View style={styles.optionStat}>
                <Ionicons name="time-outline" size={18} color="#FFF" />
                <Text style={styles.optionStatText}>{totalDuration} mins</Text>
              </View>
              <View style={styles.optionStat}>
                <Ionicons name="trending-up-outline" size={18} color="#FFF" />
                <Text style={styles.optionStatText}>
                  {averageDifficulty.toFixed(1)} avg
                </Text>
              </View>
              <View style={styles.optionStat}>
                <Ionicons name="list-outline" size={18} color="#FFF" />
                <Text style={styles.optionStatText}>
                  {option.tasks.length} tasks
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.tasksContainer}>
          <Text style={styles.tasksTitle}>Tasks</Text>
          {option.tasks.map((scheduledTask, idx) => 
            renderTask(scheduledTask, idx)
          )}
        </View>
        
        <TouchableOpacity
          style={[
            styles.selectButton,
            isSelected && styles.selectedButton
          ]}
          onPress={() => handleSelectSchedule(index)}
          disabled={isSelected}
        >
          <Text style={[
            styles.selectButtonText,
            isSelected && styles.selectedButtonText
          ]}>
            {isSelected ? 'Current Schedule' : 'Select This Schedule'}
          </Text>
          {isSelected && (
            <MaterialIcons name="check-circle" size={20} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>
    );
  };
  
  // UI Rendering
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Schedule Options</Text>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Generating your optimal schedules...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.introText}>
            Choose a schedule that works best for you. Each option organizes your tasks differently starting from now.
          </Text>
          
          {scheduleOptions.map((option, index) => 
            renderScheduleOption(option, index)
          )}
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Not seeing what you need? You can always add more tasks to your list.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 15,
  },
  backButton: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  introText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  optionContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 25,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  optionHeader: {
    height: 140,
    position: 'relative',
  },
  optionBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  optionGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 140,
  },
  optionHeaderContent: {
    padding: 15,
    position: 'relative',
    zIndex: 1,
  },
  optionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5,
  },
  optionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 15,
  },
  optionStats: {
    flexDirection: 'row',
    marginTop: 10,
  },
  optionStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  optionStatText: {
    marginLeft: 5,
    color: '#FFF',
    fontSize: 14,
  },
  tasksContainer: {
    padding: 15,
  },
  tasksTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  taskTimeContainer: {
    width: 70,
  },
  taskTime: {
    fontSize: 14,
    color: '#666',
  },
  taskIconContainer: {
    width: 30,
    alignItems: 'center',
  },
  taskDetails: {
    flex: 1,
    marginLeft: 10,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  taskDuration: {
    fontSize: 13,
    color: '#888',
  },
  difficultyIndicator: {
    flexDirection: 'row',
    width: 60,
    justifyContent: 'flex-end',
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 3,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  selectedButton: {
    backgroundColor: '#34C759',
  },
  selectButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedButtonText: {
    marginRight: 5,
  },
  footer: {
    marginTop: 10,
    marginBottom: 30,
    padding: 15,
  },
  footerText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Unused styles for chart
  // chartContainer: {
  //   borderRadius: 12,
  //   overflow: 'hidden',
  //   marginBottom: 25,
  //   elevation: 2,
  //   shadowColor: '#000',
  //   shadowOffset: { width: 0, height: 2 },
  //   shadowOpacity: 0.1,
  //   shadowRadius: 4,
  // },
  // chartTitle: {
  //   fontSize: 16,
  //   fontWeight: 'bold',
  //   color: '#333',
  //   marginBottom: 10,
  // },
  // chart: {
  //   borderTopWidth: 1,
  //   borderTopColor: '#EAEAEA',
  //   paddingTop: 15,
  // },
});

export default ScheduleSelectionScreen;