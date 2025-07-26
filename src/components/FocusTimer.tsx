// src/components/FocusTimer.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Easing,
  Alert,
  Dimensions,
  Platform
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Task } from '../models/Task';
import LottieView from 'lottie-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FocusTimerProps {
  task: Task;
  initialDuration?: number; // in minutes
  onComplete: (completed: boolean) => void;
  onClose: () => void;
}

const FocusTimer: React.FC<FocusTimerProps> = ({ 
  task, 
  initialDuration = 25, 
  onComplete,
  onClose
}) => {
  // State
  const [timeRemaining, setTimeRemaining] = useState(initialDuration * 60); // in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [showMessage, setShowMessage] = useState(false);
  const [focusMessage, setFocusMessage] = useState('');
  
  // Animations
  const progressAnim = useRef(new Animated.Value(0)).current;
  const messageOpacity = useRef(new Animated.Value(0)).current;
  const messageScale = useRef(new Animated.Value(0.5)).current;
  
  // Lottie animation refs
  const focusAnimationRef = useRef<LottieView>(null);
  const completedAnimationRef = useRef<LottieView>(null);
  
  // References to prevent stale closures in timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(isRunning);
  const timeRemainingRef = useRef(timeRemaining);
  
  // Effects
  useEffect(() => {
    isRunningRef.current = isRunning;
    timeRemainingRef.current = timeRemaining;
    
    // Start timer when isRunning becomes true
    if (isRunning) {
      startTimer();
      if (focusAnimationRef.current) {
        focusAnimationRef.current.play();
      }
      
      // Show periodic messages
      const messageInterval = setInterval(() => {
        if (isRunningRef.current && timeRemainingRef.current > 30) {
          showFocusMessage();
        }
      }, 2 * 60 * 1000); // Show message every 2 minutes
      
      return () => clearInterval(messageInterval);
    } else {
      // Clear timer when paused or stopped
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (focusAnimationRef.current) {
        focusAnimationRef.current.pause();
      }
    }
    
    // Clean up on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);
  
  // Update progress animation when time changes
  useEffect(() => {
    const totalSeconds = initialDuration * 60;
    const progress = (totalSeconds - timeRemaining) / totalSeconds;
    
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [timeRemaining, initialDuration]);
  
  // Load sound effect
  useEffect(() => {
    if (Platform.OS !== 'web') {
      loadSound();
    }
    
    return () => {
      // Unload sound when component unmounts
      if (sound) {
        sound.unloadAsync().catch(error => {
          console.log('Error unloading sound:', error);
        });
      }
    };
  }, []);
  
  // Random encouraging messages
  const getRandomMessage = useCallback(() => {
    const messages = [
      "Stay present with your task.",
      "You've got this! Keep going.",
      "Focus on one step at a time.",
      "Take a deep breath. You're making progress.",
      "Mindfully attend to each moment.",
      "Remember your 'why' behind this task.",
      "You're building momentum with each minute.",
      "Small steps lead to big progress.",
      "Your attention is your most valuable resource.",
      "Flow state activated.",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }, []);
  
  // Show focus message
  const showFocusMessage = () => {
    setFocusMessage(getRandomMessage());
    setShowMessage(true);
    
    // Animate message
    Animated.parallel([
      Animated.timing(messageOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(messageScale, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
    
    // Hide message after a few seconds
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(messageOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(messageScale, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start(() => {
        setShowMessage(false);
      });
    }, 3000);
    
    // Subtle haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(error => {
        console.log('Haptics error:', error);
      });
    }
  };
  
  // Start focus timer
  const startFocus = async () => {
    try {
      // Haptic feedback
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Start timer
      setIsRunning(true);
      setIsPaused(false);
      
      // Show initial message
      setTimeout(() => {
        if (isRunningRef.current) {
          showFocusMessage();
        }
      }, 5000);
    } catch (error) {
      console.log('Error starting focus session:', error);
      // Start timer anyway even if haptics fail
      setIsRunning(true);
      setIsPaused(false);
    }
  };
  
  // Pause the timer
  const pauseTimer = () => {
    setIsRunning(false);
    setIsPaused(true);
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(error => {
        console.log('Haptics error:', error);
      });
    }
  };
  
  // Resume the timer
  const resumeTimer = () => {
    setIsRunning(true);
    setIsPaused(false);
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(error => {
        console.log('Haptics error:', error);
      });
    }
  };
  
  // Reset the timer
  const resetTimer = () => {
    Alert.alert(
      "Reset Timer?",
      "Are you sure you want to reset the timer?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset", 
          onPress: () => {
            setIsRunning(false);
            setIsPaused(false);
            setTimeRemaining(initialDuration * 60);
            
            // Haptic feedback
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(error => {
                console.log('Haptics error:', error);
              });
            }
          }
        }
      ]
    );
  };
  
  // Stop the timer and cancel
  const stopTimer = () => {
    Alert.alert(
      "End Focus Session?",
      "Your progress won't be saved. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "End Session", 
          style: "destructive",
          onPress: () => {
            setIsRunning(false);
            setIsPaused(false);
            
            // Haptic feedback
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
                .catch(error => {
                  console.log('Haptics error:', error);
                });
            }
            
            // Inform parent
            onComplete(false);
          }
        }
      ]
    );
  };
  
  // Timer logic
  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Timer complete
          clearInterval(timerRef.current!);
          timerCompletedHandler();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Handle timer completion
  const timerCompletedHandler = async () => {
    // Play sound
    if (sound && Platform.OS !== 'web') {
      try {
        await sound.playAsync();
      } catch (error) {
        console.log('Error playing sound:', error);
      }
    }
    
    // Play completion animation
    if (completedAnimationRef.current) {
      completedAnimationRef.current.play();
    }
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        .catch(error => {
          console.log('Haptics error:', error);
        });
    }
    
    // Show completion alert
    setTimeout(() => {
      Alert.alert(
        "Focus Time Complete!",
        `Great job focusing on "${task.title}"! Did you complete this task?`,
        [
          { 
            text: "Not Yet", 
            onPress: () => onComplete(false),
          },
          { 
            text: "Yes, Complete!", 
            onPress: () => onComplete(true),
            style: "default"
          }
        ]
      );
    }, 1500); // Allow animation to play a bit
  };
  
  // Load sound effect
  const loadSound = async () => {
    if (Platform.OS === 'web') return;
    
    try {
      if (Audio) {
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/sounds/complete.wav')
        );
        setSound(sound);
      }
    } catch (error) {
      console.log('Error loading sound', error);
    }
  };
  
  // Format time as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Calculate progress percentage (0-100)
  const calculateProgress = (): number => {
    const totalSeconds = initialDuration * 60;
    return Math.round(((totalSeconds - timeRemaining) / totalSeconds) * 100);
  };

  const progressPercent = calculateProgress();
  
  return (
    <View style={styles.container}>
      {/* Background animation */}
      {/* <View style={styles.animationBackground}>
        <LottieView
          ref={focusAnimationRef}
          source={require('../../assets/animations/focus-background.json')}
          style={styles.backgroundAnimation}
          autoPlay={false}
          loop={true}
          speed={0.5}
        />
      </View> */}
      
      {/* Task information */}
      <View style={styles.taskInfoContainer}>
        <Text style={styles.focusTitle}>FOCUS MODE</Text>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <Text style={styles.taskDescription} numberOfLines={2}>
          {task.description || 'Stay focused and complete this task.'}
        </Text>
      </View>
      
      {/* Timer display */}
      <View style={styles.timerContainer}>
        {/* Replacing MotiView with Animated.View to avoid invalid hook/context error */}
        <Animated.View
          style={[
            styles.timerInnerContainer,
            // Optionally add a pulsing scale animation if desired
            isRunning && {
              transform: [{
                scale: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.02],
                }),
              }],
            },
          ]}
        >
          <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
          
          {/* Progress arc */}
          <View style={styles.progressContainer}>
            <Animated.View 
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
            <Text style={styles.progressText}>{progressPercent}%</Text>
          </View>
        </Animated.View>
      </View>
      
      {/* Focus message */}
      {showMessage && (
        <Animated.View 
          style={[
            styles.messageContainer,
            {
              opacity: messageOpacity,
              transform: [{ scale: messageScale }],
            },
          ]}
        >
          <Text style={styles.messageText}>{focusMessage}</Text>
        </Animated.View>
      )}
      
      {/* Controls */}
      <View style={styles.controlsContainer}>
        {!isRunning && !isPaused ? (
          <TouchableOpacity style={styles.startButton} onPress={startFocus}>
            {/* Remove Animated.View to avoid touch issues */}
            <View style={styles.startButtonInner}>
              <Ionicons name="play" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.startButtonText}>Begin Focus</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.controlButtonsRow}>
            <TouchableOpacity 
              style={[styles.controlButton, styles.resetButton]} 
              onPress={resetTimer}
            >
              <MaterialCommunityIcons name="restart" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            
            {isPaused ? (
              <TouchableOpacity 
                style={[styles.controlButton, styles.playButton]} 
                onPress={resumeTimer}
              >
                <Ionicons name="play" size={32} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.controlButton, styles.pauseButton]} 
                onPress={pauseTimer}
              >
                <Ionicons name="pause" size={32} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.controlButton, styles.stopButton]} 
              onPress={stopTimer}
            >
              <Ionicons name="close" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Completion animation (hidden until timer completes) */}
      <View
        pointerEvents={timeRemaining === 0 ? 'auto' : 'none'}
        style={[
          styles.completionAnimation,
          { opacity: timeRemaining === 0 ? 1 : 0 }
        ]}
      >
        <LottieView
          ref={completedAnimationRef}
          source={require('../../assets/animations/completion.json')}
          style={{ width: SCREEN_WIDTH }}
          autoPlay={false}
          loop={false}
        />
      </View>
      
      {/* Close button */}
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <MaterialCommunityIcons name="chevron-down" size={30} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
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
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  taskInfoContainer: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  focusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFBD59',
    letterSpacing: 2,
    marginBottom: 10,
  },
  taskTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  taskDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
  },
  timerInnerContainer: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  timerText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  progressContainer: {
    width: '70%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    marginTop: 15,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFBD59',
    borderRadius: 3,
  },
  progressText: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  messageContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    maxWidth: '80%',
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  controlsContainer: {
    alignItems: 'center',
    marginBottom: 50,
    width: '100%',
  },
  startButton: {
    alignItems: 'center',
  },
  startButtonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 5,
  },
  controlButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  resetButton: {
    backgroundColor: '#4A6FA5',
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#4ECDC4',
  },
  pauseButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFD166',
  },
  stopButton: {
    backgroundColor: '#FF6B6B',
  },
  completionAnimation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 100,
  },
});

export default FocusTimer;