// src/screens/FocusTimerScreen.tsx

import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  BackHandler,
  Alert,
  Platform,
  TouchableOpacity,
  Text,
  StatusBar,
  Dimensions,
  Animated,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import TaskService from '../services/TaskService';
import FocusTimer from '../components/FocusTimer';
import { Task } from '../models/Task';
import LottieView from 'lottie-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FocusTimerScreenProps {
  route: {
    params: {
      taskId: string;
      duration?: number;
    }
  };
  navigation: any;
}

const FocusTimerScreen: React.FC<FocusTimerScreenProps> = ({ 
  route, 
  navigation 
}) => {
  // Extract params
  const { taskId, duration } = route.params || {};
  
  // State
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTips, setShowTips] = useState(false);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const blurViewOpacity = useRef(new Animated.Value(0)).current;
  
  // Load task data
  useEffect(() => {
    const loadTask = async () => {
      try {
        if (!taskId) {
          throw new Error('No task ID provided');
        }
        
        const taskData = await TaskService.getTaskById(taskId);
        
        if (!taskData) {
          throw new Error('Task not found');
        }
        
        setTask(taskData);
        
        // Animate in the content
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          })
        ]).start();
      } catch (error) {
        console.error('Error loading task:', error);
        Alert.alert('Error', 'Failed to load task. Please try again.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    
    loadTask();
  }, [taskId, navigation]);
  
  // Handle back button to prevent accidental exit
  useEffect(() => {
    let backHandler: any = null;
    
    // Only use BackHandler on mobile platforms
    if (Platform.OS !== 'web') {
      try {
        backHandler = BackHandler.addEventListener(
          'hardwareBackPress',
          () => {
            Alert.alert(
              'Exit Focus Mode?',
              'Are you sure you want to exit focus mode?',
              [
                { text: 'Cancel', style: 'cancel', onPress: () => {} },
                { text: 'Exit', style: 'destructive', onPress: () => navigation.goBack() }
              ]
            );
            return true; // Prevent default back behavior
          }
        );
      } catch (error) {
        console.warn('Error setting up back handler:', error);
      }
    }
    
    return () => {
      if (backHandler) {
        try {
          backHandler.remove();
        } catch (error) {
          console.warn('Error removing back handler:', error);
        }
      }
    };
  }, [navigation]);
  
  // Handle focus time completion
  const handleFocusComplete = (completed: boolean) => {
    if (completed) {
      Alert.alert(
        'Focus Session Complete!',
        'Great job completing your focus session!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else {
      navigation.goBack();
    }
  };
  
  // Close focus timer
  const handleClose = () => {
    Alert.alert(
      'Exit Focus Mode?',
      'Are you sure you want to exit focus mode?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
        { text: 'Exit', style: 'destructive', onPress: () => navigation.goBack() }
      ]
    );
  };

  // Handle marking task as done ahead of time
  const handleTaskDone = async () => {
    if (!task) return;

    try {
      // Provide haptic feedback
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Mark task as completed
      await TaskService.completeTask(task.id);
      
      // Show success message
      Alert.alert(
        'Task Completed!', 
        'Great job completing this task!',
        [{ text: 'Exit Focus Mode', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error completing task:', error);
      Alert.alert('Error', 'Failed to mark task as completed. Please try again.');
    }
  };
  
  // Toggle focus tips
  const toggleTips = () => {
    setShowTips(!showTips);
    
    // Animate blur view
    Animated.timing(blurViewOpacity, {
      toValue: showTips ? 0 : 0.7,
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    // Provide haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        .catch(e => console.log('Haptic error:', e));
    }
  };
  
  if (loading || !task) {
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
          Preparing your focus environment...
        </Text>
      </LinearGradient>
    );
  }
  
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />
      <LinearGradient
        colors={['#0D1B2A', '#1B263B', '#415A77']}
        style={styles.gradientContainer}
      >
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <Animated.View 
            style={[
              styles.contentContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <FocusTimer
              task={task}
              initialDuration={duration || task.durationMinutes}
              onComplete={handleFocusComplete}
              onClose={handleClose}
            />

            {/* Quick Mark as Done Button */}
            <TouchableOpacity 
              style={styles.completeButton}
              onPress={handleTaskDone}
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
            
            {/* Focus Tips Button */}
            <TouchableOpacity 
              style={styles.tipsButton}
              onPress={toggleTips}
            >
              <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#FFD166" />
              <Text style={styles.tipsButtonText}>Focus Tips</Text>
            </TouchableOpacity>
          </Animated.View>
          
          {/* Focus Tips Modal */}
          {showTips && (
            <>
              <Animated.View 
                style={[
                  styles.blurView,
                  { opacity: blurViewOpacity }
                ]} 
              />
              <View style={styles.tipsModal}>
                <View style={styles.tipsHeader}>
                  <Text style={styles.tipsTitle}>Focus Enhancement Tips</Text>
                  <TouchableOpacity onPress={toggleTips}>
                    <Ionicons name="close" size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.tipsScrollView}>
                  <View style={styles.tipItem}>
                    <View style={styles.tipIconContainer}>
                      <MaterialCommunityIcons name="cellphone-off" size={24} color="#FFD166" />
                    </View>
                    <View style={styles.tipContent}>
                      <Text style={styles.tipTitle}>Eliminate Distractions</Text>
                      <Text style={styles.tipDescription}>
                        Put your phone on silent mode and turn off notifications on other devices.
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.tipItem}>
                    <View style={styles.tipIconContainer}>
                      <FontAwesome5 name="brain" size={24} color="#FFD166" />
                    </View>
                    <View style={styles.tipContent}>
                      <Text style={styles.tipTitle}>Single-Task Focus</Text>
                      <Text style={styles.tipDescription}>
                        Focus on one task at a time. Multitasking reduces efficiency and increases errors.
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.tipItem}>
                    <View style={styles.tipIconContainer}>
                      <MaterialCommunityIcons name="water" size={24} color="#FFD166" />
                    </View>
                    <View style={styles.tipContent}>
                      <Text style={styles.tipTitle}>Stay Hydrated</Text>
                      <Text style={styles.tipDescription}>
                        Keep water nearby. Hydration improves brain function and concentration.
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.tipItem}>
                    <View style={styles.tipIconContainer}>
                      <MaterialCommunityIcons name="meditation" size={24} color="#FFD166" />
                    </View>
                    <View style={styles.tipContent}>
                      <Text style={styles.tipTitle}>Mindful Breathing</Text>
                      <Text style={styles.tipDescription}>
                        If your mind wanders, pause and take 3 deep breaths to reset your focus.
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.tipItem}>
                    <View style={styles.tipIconContainer}>
                      <Ionicons name="list" size={24} color="#FFD166" />
                    </View>
                    <View style={styles.tipContent}>
                      <Text style={styles.tipTitle}>Break Tasks Down</Text>
                      <Text style={styles.tipDescription}>
                        If feeling overwhelmed, break your task into smaller, more manageable steps.
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.tipItem}>
                    <View style={styles.tipIconContainer}>
                      <MaterialCommunityIcons name="timer-sand" size={24} color="#FFD166" />
                    </View>
                    <View style={styles.tipContent}>
                      <Text style={styles.tipTitle}>Finish Strong</Text>
                      <Text style={styles.tipDescription}>
                        The last few minutes of your focus session are crucial. Maintain intensity until completion.
                      </Text>
                    </View>
                  </View>
                </ScrollView>
                
                <TouchableOpacity 
                  style={styles.closeTipsButton}
                  onPress={toggleTips}
                >
                  <Text style={styles.closeTipsText}>Return to Focus</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
  contentContainer: {
    flex: 1,
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
  completeButton: {
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
  tipsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  tipsButtonText: {
    color: '#FFD166',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 6,
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0D1B2A',
    zIndex: 10,
  },
  tipsModal: {
    position: 'absolute',
    top: '10%',
    left: 20,
    right: 20,
    bottom: '10%',
    backgroundColor: '#1B263B',
    borderRadius: 20,
    zIndex: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tipsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tipsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tipsScrollView: {
    flex: 1,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 25,
  },
  tipIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 209, 102, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  tipDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  closeTipsButton: {
    backgroundColor: '#FFD166',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 15,
  },
  closeTipsText: {
    color: '#1B263B',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FocusTimerScreen;