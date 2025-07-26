// src/screens/TaskDetailsScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { Task } from '../models/Task';
import TaskService from '../services/TaskService';
import { toDate } from '../utils/dateUtils';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

type TaskDetailsScreenProps = {
  route: RouteProp<{ params: { taskId: string } }, 'params'>;
  navigation: StackNavigationProp<any>;
};

const TaskDetailsScreen: React.FC<TaskDetailsScreenProps> = ({ navigation, route }) => {
  const { taskId } = route.params;
  
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Load task details
  useEffect(() => {
    const loadTask = async () => {
      try {
        const taskData = await TaskService.getTaskById(taskId);
        setTask(taskData);
      } catch (error) {
        console.error('Error loading task:', error);
        Alert.alert('Error', 'Failed to load task details');
      } finally {
        setLoading(false);
      }
    };
    
    loadTask();
  }, [taskId]);
  
  // Format date for display - safely handle different date types
  const formatDate = (date?: any): string => {
    if (!date) return 'No deadline';
    
    try {
      // Use our utility function to properly convert to Date
      const dateObj = toDate(date);
      return format(dateObj, 'EEEE, MMMM d, yyyy');
    } catch (e) {
      console.warn('Error formatting date:', e);
      return 'Invalid date';
    }
  };
  
  // Format time for display - safely handle different date types
  const formatTime = (date?: any): string => {
    if (!date) return '';
    
    try {
      // Use our utility function to properly convert to Date
      const dateObj = toDate(date);
      return format(dateObj, 'h:mm a');
    } catch (e) {
      console.warn('Error formatting time:', e);
      return '';
    }
  };
  
  // Delete task
  const handleDeleteTask = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await TaskService.deleteTask(taskId);
              
              // Haptic feedback
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                .catch(e => console.log('Haptic error:', e));
              
              // Navigate back
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Error', 'Failed to delete task');
            }
          },
        },
      ]
    );
  };
  
  // Start focus timer
  const handleStartFocus = () => {
    if (task) {
      navigation.navigate('FocusTimer', {
        taskId: task.id,
        duration: task.durationMinutes,
      });
    }
  };
  
  // Edit task
  const handleEditTask = () => {
    if (task) {
      navigation.navigate('EditTask', { task });
    }
  };
  
  // Share task
  const handleShareTask = async () => {
    if (!task) return;
    
    try {
      await Share.share({
        message: `Task: ${task.title}\nDeadline: ${formatDate(task.deadline)} at ${formatTime(task.deadline)}\nDuration: ${task.durationMinutes} minutes`,
        title: 'Share Task',
      });
    } catch (error) {
      console.error('Error sharing task:', error);
    }
  };
  
  // Mark as complete
  const handleCompleteTask = async () => {
    if (!task) return;
    
    try {
      await TaskService.completeTask(taskId);
      
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        .catch(e => console.log('Haptic error:', e));
      
      // Navigate back
      navigation.goBack();
    } catch (error) {
      console.error('Error completing task:', error);
      Alert.alert('Error', 'Failed to complete task');
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }
  
  // Error state - task not found
  if (!task) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Task not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{task.title}</Text>
          {task.recurrence !== 'none' && (
            <View style={styles.recurrenceTag}>
              <MaterialCommunityIcons name="refresh" size={14} color="#FFF" />
              <Text style={styles.recurrenceText}>
                {task.recurrence.charAt(0).toUpperCase() + task.recurrence.slice(1)}
              </Text>
            </View>
          )}
        </View>
        
        {task.description ? (
          <Text style={styles.description}>{task.description}</Text>
        ) : null}
      </View>
      
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <View style={styles.detailIconContainer}>
            <Ionicons name="calendar-outline" size={22} color="#007AFF" />
          </View>
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailLabel}>Deadline</Text>
            <Text style={styles.detailValue}>
              {formatDate(task.deadline)} at {formatTime(task.deadline)}
            </Text>
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailIconContainer}>
            <Ionicons name="timer-outline" size={22} color="#007AFF" />
          </View>
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{task.durationMinutes} minutes</Text>
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailIconContainer}>
            <MaterialIcons name="priority-high" size={22} color="#007AFF" />
          </View>
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailLabel}>Urgency</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <MaterialIcons
                  key={rating}
                  name={rating <= task.urgency ? 'star' : 'star-border'}
                  size={20}
                  color={rating <= task.urgency ? '#FFD700' : '#BBBBBB'}
                />
              ))}
            </View>
          </View>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailIconContainer}>
            <MaterialCommunityIcons name="brain" size={22} color="#007AFF" />
          </View>
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailLabel}>Difficulty</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <MaterialIcons
                  key={rating}
                  name={rating <= task.difficulty ? 'star' : 'star-border'}
                  size={20}
                  color={rating <= task.difficulty ? '#FFD700' : '#BBBBBB'}
                />
              ))}
            </View>
          </View>
        </View>
        
        {task.tags && task.tags.length > 0 && (
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="pricetag-outline" size={22} color="#007AFF" />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Tags</Text>
              <View style={styles.tagsContainer}>
                {task.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.focusButton]}
          onPress={handleStartFocus}
        >
          <Ionicons name="timer-outline" size={24} color="#FFF" />
          <Text style={styles.actionButtonText}>Start Focus</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.completeButton]}
          onPress={handleCompleteTask}
        >
          <Ionicons name="checkmark-circle-outline" size={24} color="#FFF" />
          <Text style={styles.actionButtonText}>Complete</Text>
        </TouchableOpacity>
        
        <View style={styles.secondaryActionsContainer}>
          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={handleEditTask}
          >
            <Ionicons name="create-outline" size={22} color="#007AFF" />
            <Text style={styles.secondaryActionText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={handleShareTask}
          >
            <Ionicons name="share-outline" size={22} color="#007AFF" />
            <Text style={styles.secondaryActionText}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={handleDeleteTask}
          >
            <Ionicons name="trash-outline" size={22} color="#FF3B30" />
            <Text style={[styles.secondaryActionText, { color: '#FF3B30' }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  recurrenceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  recurrenceText: {
    color: '#FFF',
    fontSize: 12,
    marginLeft: 4,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  detailsContainer: {
    backgroundColor: '#FFF',
    marginTop: 15,
    paddingVertical: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  detailIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  detailTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tag: {
    backgroundColor: '#EFEFEF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#666',
  },
  actionsContainer: {
    backgroundColor: '#FFF',
    marginTop: 15,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  focusButton: {
    backgroundColor: '#007AFF',
  },
  completeButton: {
    backgroundColor: '#34C759',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  secondaryActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  secondaryActionButton: {
    alignItems: 'center',
    padding: 10,
  },
  secondaryActionText: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 5,
  },
});

export default TaskDetailsScreen;