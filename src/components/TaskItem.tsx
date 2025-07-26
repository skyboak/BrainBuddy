// src/components/TaskItem.tsx

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Task } from '../models/Task';
import { format } from 'date-fns';
import { toDate, getTimeRemaining } from '../utils/dateUtils';
import { getUrgencyColor, getDifficultyColor, textColors, backgroundColors } from '../utils/colors';

// Define custom icon types to handle all the icons we need
type TaskIconType = 
  | 'checkbox-outline'
  | 'briefcase-outline'
  | 'home-outline'
  | 'book-outline'
  | 'account-group-outline'
  | 'cart-outline';

interface TaskItemProps {
  task: Task;
  onPress: () => void;
  onComplete: () => void;
  onFocus: () => void;
  showDetails?: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({ 
  task, 
  onPress, 
  onComplete,
  onFocus,
  showDetails = true 
}) => {
  // Animation for the checkbox
  const checkAnim = React.useRef(new Animated.Value(0)).current;
  
  // Format date for display
  const formatDeadline = (date: any): string => {
    // If no deadline, return appropriate message
    if (date === null || date === undefined) {
      return 'No deadline';
    }
    
    // Convert to Date
    const dateObj = toDate(date);
    if (!dateObj) return 'No deadline';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    
    if (dateObj.getTime() >= today.getTime() && dateObj.getTime() < tomorrow.getTime()) {
      // Today - show time
      return `Today, ${format(dateObj, 'h:mm a')}`;
    } else if (dateObj.getTime() >= tomorrow.getTime() && dateObj.getTime() < dayAfterTomorrow.getTime()) {
      // Tomorrow - show "Tomorrow" and time
      return `Tomorrow, ${format(dateObj, 'h:mm a')}`;
    } else {
      // Other days - show date
      return format(dateObj, 'MMM d, h:mm a');
    }
  };
  
  // Get appropriate icon based on task category (using first tag)
  const getTaskIcon = (): string => {
    if (task.tags.length === 0) {
      return 'checkbox-outline';
    }
    
    const tag = task.tags[0].toLowerCase();
    
    switch (tag) {
      case 'work':
        return 'briefcase-outline';
      case 'home':
        return 'home-outline';
      case 'study':
        return 'book-outline';
      case 'health':
        return 'fitness-outline';
      case 'social':
        return 'people-outline';
      case 'shopping':
        return 'cart-outline';
      case 'finance':
        return 'cash-outline';
      case 'personal':
        return 'person-outline';
      default:
        return 'checkbox-outline';
    }
  };
  
  // Get urgency color
  const urgencyColor = getUrgencyColor(task.urgency);
  
  // Handle task completion with animation
  const handleComplete = () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(e => console.log(e));
    
    // Start the animation
    Animated.timing(checkAnim, {
      toValue: 1,
      duration: 400,
      easing: Easing.bezier(0.175, 0.885, 0.32, 1.275),
      useNativeDriver: true,
    }).start(() => {
      // After animation completes, call the onComplete function
      onComplete();
    });
  };
  
  // Animation styles
  const animStyles = {
    transform: [
      {
        scale: checkAnim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 1.2, 0],
        }),
      },
    ],
    opacity: checkAnim.interpolate({
      inputRange: [0, 0.8, 1],
      outputRange: [1, 1, 0],
    }),
  };
  
  // Check if task has a deadline
  const hasDeadline = task.deadline !== null && task.deadline !== undefined;
  
  // Get the time remaining text
  const timeRemainingText = getTimeRemaining(task.deadline);
  
  // Determine if the task is overdue
  const isOverdue = hasDeadline && timeRemainingText === 'Overdue';
  
  return (
    <Animated.View 
      style={[
        styles.container, 
        animStyles,
        { borderLeftColor: urgencyColor, borderLeftWidth: 4 }
      ]}
    >
      <TouchableOpacity 
        style={styles.completeButton} 
        onPress={handleComplete}
        activeOpacity={0.7}
      >
        <View style={[
          styles.checkCircle, 
          { borderColor: urgencyColor }
        ]}>
          <Ionicons
            name={getTaskIcon() as keyof typeof Ionicons.glyphMap}
            size={18}
            color={urgencyColor}
          />
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.content} 
        onPress={onPress} 
        activeOpacity={0.7}
      >
        <View style={styles.headerRow}>
          <Text 
            style={styles.title} 
            numberOfLines={1}
          >
            {task.title}
          </Text>
          {task.recurrence !== 'none' && (
            <View style={styles.recurrenceContainer}>
              <MaterialCommunityIcons name="refresh" size={14} color="#FFF" />
              <Text style={styles.recurrenceText}>
                {task.recurrence.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        
        {showDetails && (
          <>
            <View style={styles.deadlineContainer}>
              <Text style={[
                styles.timeRemaining,
                isOverdue ? styles.urgentTimeRemaining : null
              ]}>
                {timeRemainingText}
              </Text>
              {hasDeadline && (
                <Text style={styles.deadline}>
                  {formatDeadline(task.deadline)}
                </Text>
              )}
            </View>
            
            <View style={styles.detailsContainer}>
              <View style={styles.durationContainer}>
                <Ionicons name="time-outline" size={14} color={textColors.tertiary} />
                <Text style={styles.duration}>{task.durationMinutes} min</Text>
              </View>
              
              {task.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {task.tags.slice(0, 2).map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                  {task.tags.length > 2 && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>+{task.tags.length - 2}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity onPress={onFocus}>
        <Ionicons name="timer-outline" size={20} color="#007AFF" />
      </TouchableOpacity>
      
      <View style={styles.difficultyContainer}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.difficultyDot,
              { backgroundColor: i < task.difficulty ? getDifficultyColor(task.difficulty) : '#E0E0E0' },
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: backgroundColors.lighter,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  completeButton: {
    marginRight: 12,
  },
  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: textColors.primary,
    flex: 1,
    marginRight: 8,
  },
  recurrenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  recurrenceText: {
    fontSize: 10,
    color: '#FFF',
    marginLeft: 2,
  },
  deadlineContainer: {
    marginBottom: 6,
  },
  timeRemaining: {
    fontSize: 13,
    fontWeight: '600',
    color: textColors.secondary,
    marginBottom: 2,
  },
  urgentTimeRemaining: {
    color: '#FF3B30',
  },
  deadline: {
    fontSize: 12,
    color: textColors.tertiary,
  },
  detailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  duration: {
    fontSize: 12,
    color: textColors.tertiary,
    marginLeft: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
  },
  tagText: {
    fontSize: 10,
    color: textColors.secondary,
  },
  difficultyContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    width: 12,
  },
  difficultyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginVertical: 1,
  },
});

export default TaskItem;