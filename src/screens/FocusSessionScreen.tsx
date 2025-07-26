// src/screens/FocusSessionScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  BackHandler,
  Platform,
  Animated,
  StatusBar,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Task, ScheduledTask, ScheduleOption } from '../models/Task';
import TaskService from '../services/TaskService';
import ScheduleService from '../services/ScheduleService';
import { format } from 'date-fns';
import { toDate } from '../utils/dateUtils';
import { useUser } from '../context/UserContext';
import LottieView from 'lottie-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FocusSessionScreenProps {
  route: {
    params: {
      scheduleId: string;
    }
  };
  navigation: any;
}

const FocusSessionScreen: React.FC<FocusSessionScreenProps> = ({ 
  route, 
  navigation 
}) => {
  // Get current user ID from context
  const { userId } = useUser();
  
  // Extract params
  const { scheduleId } = route.params || {};
  
  // State
  const [schedule, setSchedule] = useState<ScheduleOption | null>(null);
  const [tasks, setTasks] = useState<{ [key: string]: Task }>({});
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0); // in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showTaskInfo, setShowTaskInfo] = useState(false);
  
  // Animation refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const taskCardAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const infoSlideAnim = useRef(new Animated.Value(500)).current;
  const focusAnimationRef = useRef<LottieView>(null);

  // References for stale closures
  const isRunningRef = useRef(isRunning);
  const timeRemainingRef = useRef(timeRemaining);
  
  // Load schedule and tasks
  useEffect(() => {
    const loadScheduleData = async () => {
      try {
        if (!scheduleId) {
          throw new Error('No schedule ID provided');
        }
        
        // Get the schedule using current user ID
        const scheduleData = await ScheduleService.getSelectedSchedule(userId || null, new Date());
        
        if (!scheduleData) {
          throw new Error('Schedule not found');
        }
        
        setSchedule(scheduleData);
        
        // Get task details for each task in the schedule
        const tasksMap: { [key: string]: Task } = {};
        await Promise.all(
          scheduleData.tasks.map(async (scheduledTask) => {
            const task = await TaskService.getTaskById(scheduledTask.taskId);
            if (task) {
              tasksMap[scheduledTask.taskId] = task;
            }
          })
        );
        
        setTasks(tasksMap);
        
        // Set initial time remaining for first task
        if (scheduleData.tasks.length > 0) {
          const firstTask = tasksMap[scheduleData.tasks[0].taskId];
          if (firstTask) {
            setTimeRemaining(firstTask.durationMinutes * 60);
          }
        }
        
        // Start animations
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(taskCardAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          })
        ]).start();
        
      } catch (error) {
        console.error('Error loading schedule data:', error);
        Alert.alert(
          'Error',
          'Failed to load schedule data. Please try again.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } finally {
        setLoading(false);
      }
    };
    
    loadScheduleData();
  }, [scheduleId, navigation, userId]);
  
  // Handle back button to prevent accidental exit
  useEffect(() => {
    const backAction = () => {
      Alert.alert(
        'Exit Focus Session?',
        'Are you sure you want to exit your focus session?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => {} },
          { text: 'Exit', style: 'destructive', onPress: () => navigation.goBack() }
        ]
      );
      return true; // Prevent default back behavior
    };
    
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );
    
    return () => backHandler.remove();
  }, [navigation]);
  
  // Handle timer updates
  useEffect(() => {
    isRunningRef.current = isRunning;
    timeRemainingRef.current = timeRemaining;
    
    if (isRunning) {
      startTimer();
      
      // Control Lottie animation
      if (focusAnimationRef.current) {
        focusAnimationRef.current.play();
      }
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Pause Lottie animation
      if (focusAnimationRef.current) {
        focusAnimationRef.current.pause();
      }
    }
  }, [isRunning]);
  
  // Update progress animation when time changes
  useEffect(() => {
    if (!getCurrentTask()) return;
    
    const totalSeconds = getCurrentTask()!.durationMinutes * 60;
    const progress = 1 - (timeRemaining / totalSeconds);
    
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [timeRemaining]);
  
  // Get current scheduled task
  const getCurrentScheduledTask = (): ScheduledTask | null => {
    if (!schedule || !schedule.tasks || schedule.tasks.length === 0) {
      return null;
    }
    
    if (currentTaskIndex >= schedule.tasks.length) {
      return null;
    }
    
    return schedule.tasks[currentTaskIndex];
  };
  
  // Get current task
  const getCurrentTask = (): Task | null => {
    const scheduledTask = getCurrentScheduledTask();
    if (!scheduledTask) {
      return null;
    }
    
    return tasks[scheduledTask.taskId] || null;
  };
  
  // Start timer
  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Timer complete
          clearInterval(timerRef.current!);
          setIsRunning(false);
          handleTaskComplete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Toggle timer
  const toggleTimer = () => {
    if (isRunning) {
      setIsRunning(false);
      setIsPaused(true);
    } else {
      setIsRunning(true);
      setIsPaused(false);
    }
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        .catch(error => console.warn('Haptic error:', error));
    }
  };
  
  // Reset timer
  const resetTimer = () => {
    if (!getCurrentTask()) return;
    
    Alert.alert(
      'Reset Timer?',
      'Are you sure you want to reset the timer?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          onPress: () => {
            setIsRunning(false);
            setIsPaused(false);
            setTimeRemaining(getCurrentTask()!.durationMinutes * 60);
            
            // Haptic feedback
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                .catch(error => console.warn('Haptic error:', error));
            }
          }
        }
      ]
    );
  };
  
  // Skip to next task
  const skipToNextTask = () => {
    Alert.alert(
      'Skip Task?',
      'Are you sure you want to skip this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Skip', 
          onPress: () => {
            handleTaskComplete(false);
            
            // Haptic feedback
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                .catch(error => console.warn('Haptic error:', error));
            }
          }
        }
      ]
    );
  };
  
  // Handle task completion
  const handleTaskComplete = async (completed: boolean) => {
    const currentScheduledTask = getCurrentScheduledTask();
    const currentTask = getCurrentTask();
    
    if (!currentScheduledTask || !currentTask) return;
    
    try {
      if (completed) {
        // Mark task as completed in the database
        await TaskService.completeTask(currentScheduledTask.taskId);
        
        // Update completed tasks list
        setCompletedTasks(prev => [...prev, currentScheduledTask.taskId]);
        
        // Haptic feedback for success
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
      
      // Stop timer
      setIsRunning(false);
      setIsPaused(false);
      
      // Move to next task with animation
      Animated.parallel([
        Animated.timing(taskCardAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start(() => {
        // Increment task index
        const nextIndex = currentTaskIndex + 1;
        
        if (nextIndex >= (schedule?.tasks.length || 0)) {
          // End of schedule
          handleSessionComplete();
        } else {
          // Go to next task
          setCurrentTaskIndex(nextIndex);
          
          // Set new timer duration
          const nextTask = tasks[schedule!.tasks[nextIndex].taskId];
          if (nextTask) {
            setTimeRemaining(nextTask.durationMinutes * 60);
          }
          
          // Reset progress animation
          progressAnim.setValue(0);
          
          // Animate in the new task
          taskCardAnim.setValue(0);
          fadeAnim.setValue(0);
          
          Animated.parallel([
            Animated.timing(taskCardAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            })
          ]).start();
        }
      });
    } catch (error) {
      console.error('Error handling task completion:', error);
      Alert.alert('Error', 'Failed to update task. Please try again.');
    }
  };
  
  // Handle session completion
  const handleSessionComplete = () => {
    Alert.alert(
      'Focus Session Complete!',
      `Great job! You completed ${completedTasks.length} out of ${schedule?.tasks.length || 0} tasks.`,
      [{ text: 'Return to Dashboard', onPress: () => navigation.navigate('Dashboard') }]
    );
  };
  
  // Format time (mm:ss)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Format scheduled time
  const formatScheduledTime = (date: any): string => {
    const dateObj = toDate(date);
    if (!dateObj) return '';
    return format(dateObj, 'h:mm a');
  };
  
  // Calculate progress percentage
  const calculateProgress = (): number => {
    if (!getCurrentTask()) return 0;
    
    const totalSeconds = getCurrentTask()!.durationMinutes * 60;
    return Math.round(((totalSeconds - timeRemaining) / totalSeconds) * 100);
  };
  
  // Toggle task info panel
  const toggleTaskInfo = () => {
    setShowTaskInfo(!showTaskInfo);
    
    Animated.timing(infoSlideAnim, {
      toValue: showTaskInfo ? 500 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        .catch(error => console.warn('Haptic error:', error));
    }
  };
  
  // Render loading screen
  if (loading || !schedule || !getCurrentTask()) {
    return (
      <LinearGradient
        colors={['#0D1B2A', '#1B263B', '#415A77']}
        style={styles.loadingContainer}
      >
        <LottieView 
          source={require('../../assets/animations/loading.json')} 
          autoPlay 
          loop 
          style={styles.loadingAnimation}
        />
        <Text style={styles.loadingText}>
          Preparing your focus session...
        </Text>
      </LinearGradient>
    );
  }
  
  const currentTask = getCurrentTask()!;
  const currentScheduledTask = getCurrentScheduledTask()!;
  const progressPercent = calculateProgress();
  
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />
      <LinearGradient
        colors={['#0D1B2A', '#1B263B', '#415A77']}
        style={styles.gradientContainer}
      >
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          {/* Background animation */}
          <View style={styles.animationBackground}>
            <LottieView
              ref={focusAnimationRef}
              source={require('../../assets/animations/focus-background.json')}
              style={styles.backgroundAnimation}
              autoPlay={false}
              loop={true}
              speed={0.5}
            />
          </View>
          
          {/* Header */}
          <Animated.View 
            style={[
              styles.header, 
              { opacity: fadeAnim }
            ]}
          >
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => {
                Alert.alert(
                  'Exit Focus Session?',
                  'Are you sure you want to exit the focus session?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Exit', style: 'destructive', onPress: () => navigation.goBack() }
                  ]
                );
              }}
            >
              <MaterialCommunityIcons name="chevron-down" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionTitle}>FOCUS SESSION</Text>
              <View style={styles.sessionProgress}>
                <Text style={styles.progressText}>
                  Task {currentTaskIndex + 1} of {schedule.tasks.length}
                </Text>
                <View style={styles.progressTrack}>
                  <Animated.View 
                    style={[
                      styles.progressBar,
                      {
                        width: `${((currentTaskIndex) / schedule.tasks.length) * 100}%`
                      }
                    ]}
                  />
                </View>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.infoButton} 
              onPress={toggleTaskInfo}
            >
              <Ionicons name="information-circle-outline" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
          
          {/* Task card with timer */}
          <Animated.View 
            style={[
              styles.taskCard,
              {
                opacity: taskCardAnim,
                transform: [
                  { 
                    translateY: taskCardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0]
                    })
                  }
                ]
              }
            ]}
          >
            {/* Task header */}
            <View style={styles.taskHeader}>
              <View style={styles.taskIconContainer}>
                <MaterialCommunityIcons 
                  name="checkbox-marked-circle-outline" 
                  size={24} 
                  color="#FFD166" 
                />
              </View>
              <Text style={styles.taskTitle} numberOfLines={2}>
                {currentTask.title}
              </Text>
            </View>
            
            {/* Timer display */}
            <View style={styles.timerContainer}>
              <Animated.View
                style={[
                  styles.timerCircle,
                  {
                    transform: [{
                      scale: isRunning ? 
                        Animated.modulo(
                          Animated.divide(
                            Animated.add(timeRemaining, new Animated.Value(0)),
                            new Animated.Value(2)
                          ),
                          0.02
                        ).interpolate({
                          inputRange: [0, 0.01, 0.02],
                          outputRange: [1, 1.02, 1]
                        }) : 1
                    }]
                  }
                ]}
              >
                <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
                <Text style={styles.timerSubtext}>remaining</Text>
              </Animated.View>
              
              {/* Progress bar */}
              <View style={styles.timerProgressContainer}>
                <View style={styles.timerProgressTrack}>
                  <Animated.View 
                    style={[
                      styles.timerProgressBar,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%']
                        })
                      }
                    ]}
                  />
                </View>
                <Text style={styles.timerProgressText}>{progressPercent}% complete</Text>
              </View>
            </View>
            
            {/* Timer controls */}
            <View style={styles.controlsContainer}>
              <TouchableOpacity 
                style={styles.controlButton} 
                onPress={resetTimer}
              >
                <MaterialCommunityIcons name="restart" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.playPauseButton} 
                onPress={toggleTimer}
              >
                <LinearGradient
                  colors={isRunning ? ['#FF9F1C', '#FFBF69'] : ['#06D6A0', '#1B9AAA']}
                  style={styles.playPauseButtonGradient}
                >
                  <Ionicons 
                    name={isRunning ? "pause" : "play"} 
                    size={36} 
                    color="#FFFFFF" 
                  />
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.controlButton} 
                onPress={skipToNextTask}
              >
                <Ionicons name="play-skip-forward" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            {/* Complete task button */}
            <TouchableOpacity 
              style={styles.completeButton}
              onPress={() => handleTaskComplete(true)}
            >
              <LinearGradient
                colors={['#06D6A0', '#1B9AAA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.completeButtonGradient}
              >
                <MaterialCommunityIcons name="check-circle-outline" size={24} color="#FFF" />
                <Text style={styles.completeButtonText}>Mark Complete</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
          
          {/* Task info slide-in panel */}
          <Animated.View
            pointerEvents={showTaskInfo ? 'auto' : 'none'}
            style={[
              styles.taskInfoPanel,
              {
                transform: [
                  { translateX: infoSlideAnim }
                ]
              }
            ]}
          >
            <View style={styles.taskInfoHeader}>
              <Text style={styles.taskInfoTitle}>Task Details</Text>
              <TouchableOpacity onPress={toggleTaskInfo}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.taskInfoContent}>
              <View style={styles.taskInfoSection}>
                <Text style={styles.taskInfoSectionTitle}>Description</Text>
                <Text style={styles.taskInfoDescription}>
                  {currentTask.description || 'No description provided.'}
                </Text>
              </View>
              
              <View style={styles.taskInfoSection}>
                <Text style={styles.taskInfoSectionTitle}>Schedule</Text>
                <View style={styles.taskInfoDetail}>
                  <Ionicons name="time-outline" size={20} color="#FFD166" />
                  <Text style={styles.taskInfoDetailText}>
                    Scheduled: {formatScheduledTime(currentScheduledTask.startTime)} - {formatScheduledTime(currentScheduledTask.endTime)}
                  </Text>
                </View>
                
                <View style={styles.taskInfoDetail}>
                  <Ionicons name="hourglass-outline" size={20} color="#FFD166" />
                  <Text style={styles.taskInfoDetailText}>
                    Duration: {currentTask.durationMinutes} minutes
                  </Text>
                </View>
              </View>
              
              <View style={styles.taskInfoSection}>
                <Text style={styles.taskInfoSectionTitle}>Priority</Text>
                <View style={styles.priorityContainer}>
                  <Text style={styles.priorityLabel}>Urgency:</Text>
                  <View style={styles.ratingContainer}>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <MaterialCommunityIcons
                        key={rating}
                        name={rating <= currentTask.urgency ? 'star' : 'star-outline'}
                        size={20}
                        color={rating <= currentTask.urgency ? '#FFD166' : 'rgba(255, 255, 255, 0.3)'}
                      />
                    ))}
                  </View>
                </View>
                
                <View style={styles.priorityContainer}>
                  <Text style={styles.priorityLabel}>Difficulty:</Text>
                  <View style={styles.ratingContainer}>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <MaterialCommunityIcons
                        key={rating}
                        name={rating <= currentTask.difficulty ? 'star' : 'star-outline'}
                        size={20}
                        color={rating <= currentTask.difficulty ? '#FFD166' : 'rgba(255, 255, 255, 0.3)'}
                      />
                    ))}
                  </View>
                </View>
              </View>
              
              {currentTask.tags && currentTask.tags.length > 0 && (
                <View style={styles.taskInfoSection}>
                  <Text style={styles.taskInfoSectionTitle}>Tags</Text>
                  <View style={styles.tagsContainer}>
                    {currentTask.tags.map((tag, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.closeInfoButton}
              onPress={toggleTaskInfo}
            >
              <Text style={styles.closeInfoButtonText}>Return to Focus</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  animationBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  backgroundAnimation: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingAnimation: {
    width: 200,
    height: 200,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionInfo: {
    alignItems: 'center',
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFBD59',
    letterSpacing: 2,
    marginBottom: 5,
  },
  sessionProgress: {
    alignItems: 'center',
    width: 150,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 5,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFBD59',
    borderRadius: 2,
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCard: {
    backgroundColor: 'rgba(27, 38, 59, 0.7)',
    borderRadius: 20,
    margin: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  taskIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 209, 102, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  timerCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timerSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 5,
  },
  timerProgressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  timerProgressTrack: {
    width: '80%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  timerProgressBar: {
    height: '100%',
    backgroundColor: '#FFBD59',
    borderRadius: 3,
  },
  timerProgressText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  playPauseButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  completeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  taskInfoPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '85%',
    backgroundColor: '#1B263B',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    zIndex: 10,
  },
  taskInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  taskInfoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  taskInfoContent: {
    flex: 1,
  },
  taskInfoSection: {
    marginBottom: 25,
  },
  taskInfoSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFBD59',
    marginBottom: 10,
  },
  taskInfoDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  taskInfoDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  taskInfoDetailText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 10,
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  priorityLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    width: 80,
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(255, 209, 102, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#FFD166',
  },
  closeInfoButton: {
    backgroundColor: '#FFD166',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 15,
  },
  closeInfoButtonText: {
    color: '#1B263B',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FocusSessionScreen;