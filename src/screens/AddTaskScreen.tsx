// src/screens/AddTaskScreen.tsx

import React, { useState, useEffect } from 'react';
import {
View,
Text,
StyleSheet,
TextInput,
TouchableOpacity,
ScrollView,
Platform,
Alert,
KeyboardAvoidingView,
Switch,
Modal,
} from 'react-native';
import { MaterialIcons, AntDesign, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { RecurrenceType } from '../models/Task';
import TaskService from '../services/TaskService';
import TagService from '../services/TagService';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUser } from '../context/UserContext';

type AddTaskScreenProps = {
navigation: StackNavigationProp<any>;
};

// Types for recurrence configuration
type RecurrenceConfig = {
dayOfWeek?: number; // 0-6, where 0 is Sunday
dayOfMonth?: number; // 1-31
};

const AddTaskScreen: React.FC<AddTaskScreenProps> = ({ navigation }) => {
// Get current user ID from context
const { userId } = useUser();

// State for task attributes
const [title, setTitle] = useState('');
const [description, setDescription] = useState('');
const [urgency, setUrgency] = useState(3);
const [difficulty, setDifficulty] = useState(3);
const [durationMinutes, setDurationMinutes] = useState(30);

// Task type - either one-time or recurring
const [isRecurring, setIsRecurring] = useState(false);

// One-time task state
const [deadline, setDeadline] = useState(new Date());
const [hasDeadline, setHasDeadline] = useState(true);

// Recurring task state
const [recurrence, setRecurrence] = useState<RecurrenceType>('daily');
const [recurrenceConfig, setRecurrenceConfig] = useState<RecurrenceConfig>({
  dayOfWeek: new Date().getDay(), // Default to today's day of week
  dayOfMonth: new Date().getDate(), // Default to today's day of month
});

// Recurrence configuration modals
const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);

const [tags, setTags] = useState<string[]>([]);
const [tagInput, setTagInput] = useState('');
const [allTags, setAllTags] = useState<string[]>([]);
const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

useEffect(() => {
  const loadTags = async () => {
    try {
      const existingTags = await TagService.getTags(userId || null);
      setAllTags(existingTags);
    } catch (e) {
      console.warn('Failed to load tags', e);
    }
  };
  loadTags();
}, [userId]);

useEffect(() => {
  if (tagInput.trim().length === 0) {
    setTagSuggestions([]);
  } else {
    const filtered = allTags.filter(
      t => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t)
    );
    setTagSuggestions(filtered.slice(0, 5));
  }
}, [tagInput, allTags, tags]);

// State for date/time picker
const [showDatePicker, setShowDatePicker] = useState(false);
const [showTimePicker, setShowTimePicker] = useState(false);

// Handle saving the task
const handleSaveTask = async () => {
  // Validate inputs
  if (!title.trim()) {
    Alert.alert('Error', 'Please enter a task title');
    return;
  }
  
  if (durationMinutes <= 0) {
    Alert.alert('Error', 'Task duration must be greater than 0');
    return;
  }
  
  try {
    // Create task data based on whether it's a one-time or recurring task
    const taskData = {
      title,
      description,
      urgency,
      difficulty,
      durationMinutes,
      deadline: isRecurring || !hasDeadline ? null : deadline,
      recurrence: isRecurring ? recurrence : 'none', // Set recurrence only for recurring tasks
      tags,
      recurrenceConfig: isRecurring ? recurrenceConfig : undefined, // Store recurrence configuration
    };

    // Save to database using current user ID
    await TaskService.createTask(userId || null, taskData);
    await TagService.addTags(userId || null, tags);
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    // Navigate back
    navigation.goBack();
  } catch (error) {
    console.error('Error saving task:', error);
    Alert.alert('Error', 'Failed to save task. Please try again.');
  }
};

// Toggle task type between one-time and recurring
const toggleTaskType = () => {
  setIsRecurring(!isRecurring);
  
  // Haptic feedback
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      .catch(error => console.warn('Haptic error:', error));
  }
};

// Open recurrence configuration modal
const openRecurrenceConfig = () => {
  setShowRecurrenceModal(true);
  
  // Haptic feedback
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      .catch(error => console.warn('Haptic error:', error));
  }
};

// Change recurrence type
const changeRecurrenceType = (type: RecurrenceType) => {
  setRecurrence(type);
  
  // Haptic feedback
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      .catch(error => console.warn('Haptic error:', error));
  }
  
  // If changing to daily, close the modal as no further config is needed
  if (type === 'daily') {
    setShowRecurrenceModal(false);
  }
};

// Handle date/time selection
const onDateChange = (event: any, selectedDate?: Date) => {
  setShowDatePicker(false);
  
  if (selectedDate) {
    const newDeadline = new Date(deadline);
    newDeadline.setFullYear(selectedDate.getFullYear());
    newDeadline.setMonth(selectedDate.getMonth());
    newDeadline.setDate(selectedDate.getDate());
    setDeadline(newDeadline);
  }
};

// Get day of week name
const getDayOfWeekName = (day: number): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day];
};

// Get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
const getOrdinalSuffix = (day: number): string => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

// Format recurrence description
const getRecurrenceDescription = (): string => {
  switch (recurrence) {
    case 'daily':
      return 'Every day';
    case 'weekly':
      return `Every ${getDayOfWeekName(recurrenceConfig.dayOfWeek || 0)}`;
    case 'monthly':
      const day = recurrenceConfig.dayOfMonth || 1;
      return `Every ${day}${getOrdinalSuffix(day)} day of the month`;
    default:
      return 'No recurrence';
  }
};

// Handle tag input
const addTag = () => {
  if (tagInput.trim() && !tags.includes(tagInput.trim())) {
    setTags([...tags, tagInput.trim()]);
    setAllTags(Array.from(new Set([...allTags, tagInput.trim()])));
    setTagInput('');
    setTagSuggestions([]);
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        .catch(error => console.warn('Haptic error:', error));
    }
  }
};

const removeTag = (tag: string) => {
  setTags(tags.filter(t => t !== tag));
  setTagSuggestions([]);
  
  // Haptic feedback
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      .catch(error => console.warn('Haptic error:', error));
  }
};

const toggleTag = (tag: string) => {
  if (tags.includes(tag)) {
    removeTag(tag);
  } else {
    setTags([...tags, tag]);
  }
};

// Format date/time for display
const formatDate = (date: Date): string => {
  return date.toLocaleDateString();
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Handle duration changes with validation
const updateDuration = (value: number) => {
  // Ensure duration is between 5 and 240 minutes (4 hours)
  const newValue = Math.max(5, Math.min(240, value));
  setDurationMinutes(newValue);
  
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      .catch(error => console.warn('Haptic error:', error));
  }
};
const onTimeChange = (event: any, selectedTime?: Date) => {
  setShowTimePicker(false);
  
  if (selectedTime) {
    const newDeadline = new Date(deadline);
    newDeadline.setHours(selectedTime.getHours());
    newDeadline.setMinutes(selectedTime.getMinutes());
    setDeadline(newDeadline);
  }
};
// Render rating input for urgency/difficulty
const renderRating = (
  value: number,
  onChange: (value: number) => void,
  label: string
) => {
  return (
    <View style={styles.ratingContainer}>
      <Text style={styles.ratingLabel}>{label}:</Text>
      <View style={styles.ratingStars}>
        {[1, 2, 3, 4, 5].map(rating => (
          <TouchableOpacity
            key={rating}
            onPress={() => {
              onChange(rating);
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  .catch(error => console.warn('Haptic error:', error));
              }
            }}
            style={styles.starButton}
            accessibilityLabel={`${label} level ${rating}`}
            accessibilityRole="button"
          >
            <MaterialIcons
              name={rating <= value ? 'star' : 'star-border'}
              size={30}
              color={rating <= value ? '#FFD700' : '#BBBBBB'}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

return (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  >
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        {/* Task Title */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Task Name</Text>
          <TextInput
            style={styles.textInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter task name"
            autoCapitalize="sentences"
            maxLength={100}
            accessibilityLabel="Task name input"
          />
        </View>
        
        {/* Task Description */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter task description (optional)"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            accessibilityLabel="Task description input"
          />
        </View>
        
        {/* Urgency Rating */}
        {renderRating(urgency, setUrgency, 'Urgency')}
        
        {/* Difficulty Rating */}
        {renderRating(difficulty, setDifficulty, 'Difficulty')}
        
        {/* Duration */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Duration (minutes)</Text>
          <View style={styles.durationContainer}>
            <TouchableOpacity
              style={styles.durationButton}
              onPress={() => updateDuration(durationMinutes - 5)}
              accessibilityLabel="Decrease duration by 5 minutes"
            >
              <AntDesign name="minus" size={20} color="#007AFF" />
            </TouchableOpacity>
            
            <TextInput
              style={styles.durationInput}
              value={durationMinutes.toString()}
              onChangeText={(text) => {
                const value = parseInt(text);
                if (!isNaN(value) && value > 0) {
                  setDurationMinutes(value);
                } else if (text === '') {
                  setDurationMinutes(0);
                }
              }}
              keyboardType="number-pad"
              maxLength={3}
              accessibilityLabel="Duration in minutes"
            />
            
            <TouchableOpacity
              style={styles.durationButton}
              onPress={() => updateDuration(durationMinutes + 5)}
              accessibilityLabel="Increase duration by 5 minutes"
            >
              <AntDesign name="plus" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Task Type Selector (One-time vs Recurring) */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Task Type</Text>
          <View style={styles.taskTypeContainer}>
            <TouchableOpacity
              style={[
                styles.taskTypeOption,
                !isRecurring && styles.taskTypeOptionActive
              ]}
              onPress={() => setIsRecurring(false)}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={!isRecurring ? "#FFF" : "#333"}
              />
              <Text
                style={[
                  styles.taskTypeText,
                  !isRecurring && styles.taskTypeTextActive
                ]}
              >
                One-time
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.taskTypeOption,
                isRecurring && styles.taskTypeOptionActive
              ]}
              onPress={() => setIsRecurring(true)}
            >
              <Ionicons
                name="repeat-outline"
                size={20}
                color={isRecurring ? "#FFF" : "#333"}
              />
              <Text
                style={[
                  styles.taskTypeText,
                  isRecurring && styles.taskTypeTextActive
                ]}
              >
                Recurring
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Show either Deadline or Recurrence settings based on task type */}
        {!isRecurring ? (
          // One-time task: Deadline Picker
          <View style={styles.inputContainer}>
            <View style={styles.deadlineHeader}>
              <Text style={styles.label}>Deadline</Text>
              <View style={styles.noDeadlineContainer}>
                <Text style={styles.noDeadlineText}>No deadline</Text>
                <Switch
                  value={!hasDeadline}
                  onValueChange={(val) => {
                    setHasDeadline(!val);
                    if (val) {
                      setShowDatePicker(false);
                      setShowTimePicker(false);
                    }
                  }}
                />
              </View>
            </View>

            {hasDeadline && (
            <View style={styles.deadlineContainer}>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
                accessibilityLabel="Select deadline date"
              >
                <Ionicons name="calendar-outline" size={20} color="#007AFF" />
                <Text style={styles.dateTimeText}>{formatDate(deadline)}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={() => setShowTimePicker(true)}
                accessibilityLabel="Select deadline time"
              >
                <Ionicons name="time-outline" size={20} color="#007AFF" />
                <Text style={styles.dateTimeText}>{formatTime(deadline)}</Text>
              </TouchableOpacity>
            </View>
            )}
            
            {showDatePicker && (
              <DateTimePicker
                value={deadline}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}
            
            {showTimePicker && (
              <DateTimePicker
                value={deadline}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onTimeChange}
              />
            )}
          </View>
        ) : (
          // Recurring task: Recurrence Settings
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Recurrence</Text>
            <View style={styles.recurrenceContainer}>
              {(['daily', 'weekly', 'monthly'] as RecurrenceType[]).map(
                (option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.recurrenceOption,
                      recurrence === option && styles.recurrenceOptionActive,
                    ]}
                    onPress={() => changeRecurrenceType(option)}
                    accessibilityLabel={`${option} recurrence option`}
                    accessibilityState={{ selected: recurrence === option }}
                  >
                    <Text
                      style={[
                        styles.recurrenceText,
                        recurrence === option && styles.recurrenceTextActive,
                      ]}
                    >
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
            
            {/* Recurrence configuration */}
            <View style={styles.recurrenceDetailsContainer}>
              <Text style={styles.recurrenceDescription}>
                {getRecurrenceDescription()}
              </Text>
              
              {/* Only show configure button for weekly or monthly recurrence */}
              {(recurrence === 'weekly' || recurrence === 'monthly') && (
                <TouchableOpacity
                  style={styles.configureButton}
                  onPress={openRecurrenceConfig}
                >
                  <Text style={styles.configureButtonText}>Configure</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        
        {/* Tags */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Tags</Text>
          <View style={styles.tagInputContainer}>
            <TextInput
              style={styles.tagInput}
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="Add tag (e.g., work, home)"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={addTag}
              accessibilityLabel="Tag input"
            />
            
            <TouchableOpacity 
              style={styles.addTagButton} 
              onPress={addTag}
              accessibilityLabel="Add tag button"
            >
              <Ionicons name="add" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        {tagSuggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {tagSuggestions.map(suggestion => (
              <TouchableOpacity
                  key={suggestion}
                  style={styles.suggestionItem}
                  onPress={() => {
                    setTagInput(suggestion);
                    addTag();
                  }}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
            ))}
          </View>
        )}

        {allTags.length > 0 && (
          <View style={styles.availableTagsContainer}>
            {allTags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.tagOption,
                  tags.includes(tag) && styles.tagOptionSelected,
                ]}
                onPress={() => toggleTag(tag)}
              >
                <Text
                  style={[
                    styles.tagOptionText,
                    tags.includes(tag) && styles.tagOptionTextSelected,
                  ]}
                >
                  {tag}
                </Text>
                {tags.includes(tag) && (
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color="#FFF"
                    style={styles.tagOptionIcon}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.tagsContainer}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
                <TouchableOpacity
                  style={styles.removeTagButton}
                  onPress={() => removeTag(tag)}
                  accessibilityLabel={`Remove ${tag} tag`}
                >
                  <Ionicons name="close" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
        
        {/* Save Button */}
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSaveTask}
          accessibilityLabel="Add task button"
          accessibilityRole="button"
        >
          <Text style={styles.saveButtonText}>Add Task</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    
    {/* Recurrence Configuration Modal */}
    <Modal
      visible={showRecurrenceModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowRecurrenceModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Configure {recurrence.charAt(0).toUpperCase() + recurrence.slice(1)} Recurrence
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowRecurrenceModal(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {recurrence === 'weekly' ? (
            // Weekly recurrence config
            <View style={styles.daySelector}>
              <Text style={styles.configLabel}>Day of week:</Text>
              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayOption,
                    recurrenceConfig.dayOfWeek === day && styles.dayOptionSelected
                  ]}
                  onPress={() => {
                    setRecurrenceConfig({ ...recurrenceConfig, dayOfWeek: day });
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                        .catch(error => console.warn('Haptic error:', error));
                    }
                  }}
                >
                  <Text 
                    style={[
                      styles.dayText,
                      recurrenceConfig.dayOfWeek === day && styles.dayTextSelected
                    ]}
                  >
                    {getDayOfWeekName(day).substring(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : recurrence === 'monthly' ? (
            // Monthly recurrence config
            <View style={styles.dayOfMonthContainer}>
              <Text style={styles.configLabel}>Day of month:</Text>
              <View style={styles.dayOfMonthSelector}>
                {[...Array(31)].map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.dayOfMonthOption,
                      recurrenceConfig.dayOfMonth === i + 1 && styles.dayOfMonthSelected
                    ]}
                    onPress={() => {
                      setRecurrenceConfig({ ...recurrenceConfig, dayOfMonth: i + 1 });
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                          .catch(error => console.warn('Haptic error:', error));
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.dayOfMonthText,
                        recurrenceConfig.dayOfMonth === i + 1 && styles.dayOfMonthTextSelected
                      ]}
                    >
                      {i + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}
          
          <TouchableOpacity
            style={styles.saveConfigButton}
            onPress={() => setShowRecurrenceModal(false)}
          >
            <Text style={styles.saveConfigButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  </KeyboardAvoidingView>
);
};

const styles = StyleSheet.create({
container: {
  flex: 1,
  backgroundColor: '#F9FAFC',
},
formContainer: {
  padding: 20,
},
inputContainer: {
  marginBottom: 20,
},
label: {
  fontSize: 16,
  fontWeight: '500',
  color: '#333',
  marginBottom: 8,
},
textInput: {
  backgroundColor: '#FFF',
  borderWidth: 1,
  borderColor: '#DDD',
  borderRadius: 8,
  padding: 12,
  fontSize: 16,
},
textArea: {
  height: 100,
},
toggleContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
},
ratingContainer: {
  marginBottom: 20,
},
ratingLabel: {
  fontSize: 16,
  fontWeight: '500',
  color: '#333',
  marginBottom: 8,
},
ratingStars: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingHorizontal: 40,
},
starButton: {
  padding: 5,
},
durationContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
},
durationButton: {
  backgroundColor: '#F0F0F0',
  padding: 10,
  borderRadius: 8,
  width: 40,
  height: 40,
  alignItems: 'center',
  justifyContent: 'center',
},
durationInput: {
  backgroundColor: '#FFF',
  borderWidth: 1,
  borderColor: '#DDD',
  borderRadius: 8,
  padding: 10,
  marginHorizontal: 10,
  width: 60,
  textAlign: 'center',
  fontSize: 16,
},
taskTypeContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 10,
},
taskTypeOption: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#F0F0F0',
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderRadius: 8,
  flex: 1,
  marginHorizontal: 5,
},
taskTypeOptionActive: {
  backgroundColor: '#007AFF',
},
taskTypeText: {
  fontSize: 16,
  fontWeight: '500',
  color: '#333',
  marginLeft: 8,
},
taskTypeTextActive: {
  color: '#FFFFFF',
},
deadlineHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},
noDeadlineContainer: {
  flexDirection: 'row',
  alignItems: 'center',
},
noDeadlineText: {
  marginRight: 8,
  color: '#333',
},
deadlineContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
},
datePickerButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FFF',
  borderWidth: 1,
  borderColor: '#DDD',
  borderRadius: 8,
  padding: 12,
  flex: 1,
  marginRight: 10,
},
timePickerButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FFF',
  borderWidth: 1,
  borderColor: '#DDD',
  borderRadius: 8,
  padding: 12,
  width: 100,
},
dateTimeText: {
  marginLeft: 10,
  fontSize: 16,
  color: '#333',
},
recurrenceHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},
recurrenceNote: {
  fontSize: 12,
  color: '#999',
  fontStyle: 'italic',
},
recurrenceContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
},
recurrenceOption: {
  backgroundColor: '#F0F0F0',
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 8,
  flex: 1,
  alignItems: 'center',
  marginHorizontal: 4,
},
recurrenceOptionActive: {
  backgroundColor: '#007AFF',
},
recurrenceText: {
  color: '#333',
  fontSize: 14,
  fontWeight: '500',
},
recurrenceTextActive: {
  color: '#FFF',
},
recurrenceDetailsContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 16,
  backgroundColor: '#F8F8F8',
  padding: 12,
  borderRadius: 8,
},
recurrenceDescription: {
  fontSize: 14,
  color: '#555',
  flex: 1,
},
configureButton: {
  backgroundColor: '#007AFF',
  paddingVertical: 6,
  paddingHorizontal: 12,
  borderRadius: 6,
},
configureButtonText: {
  color: '#FFF',
  fontSize: 14,
  fontWeight: '500',
},
tagInputContainer: {
  flexDirection: 'row',
  marginBottom: 10,
},
tagInput: {
  flex: 1,
  backgroundColor: '#FFF',
  borderWidth: 1,
  borderColor: '#DDD',
  borderRadius: 8,
  padding: 12,
  fontSize: 16,
  marginRight: 10,
},
  addTagButton: {
    backgroundColor: '#007AFF',
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availableTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tagOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagOptionSelected: {
    backgroundColor: '#007AFF',
  },
  tagOptionText: {
    color: '#333',
    fontSize: 14,
  },
  tagOptionTextSelected: {
    color: '#FFF',
    fontWeight: '500',
  },
  tagOptionIcon: {
    marginLeft: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
tag: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#007AFF',
  borderRadius: 16,
  paddingVertical: 6,
  paddingHorizontal: 12,
  marginRight: 8,
  marginBottom: 8,
},
  tagText: {
    color: '#FFF',
    fontSize: 14,
    marginRight: 4,
  },
  suggestionsContainer: {
    backgroundColor: '#FFF',
    borderColor: '#DDD',
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 120,
    marginTop: 4,
  },
  suggestionItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  suggestionText: {
    color: '#333',
  },
  removeTagButton: {
  width: 20,
  height: 20,
  borderRadius: 10,
  backgroundColor: 'rgba(255, 255, 255, 0.3)',
  alignItems: 'center',
  justifyContent: 'center',
},
saveButton: {
  backgroundColor: '#007AFF',
  borderRadius: 8,
  padding: 16,
  alignItems: 'center',
  marginTop: 20,
},
saveButtonText: {
  color: '#FFF',
  fontSize: 16,
  fontWeight: 'bold',
},
// Modal styles
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'flex-end',
},
modalContainer: {
  backgroundColor: '#FFF',
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  padding: 20,
  maxHeight: '80%',
},
modalHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20,
  paddingBottom: 10,
  borderBottomWidth: 1,
  borderBottomColor: '#EFEFEF',
},
modalTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#333',
},
closeButton: {
  padding: 5,
},
configLabel: {
  fontSize: 16,
  fontWeight: '500',
  color: '#333',
  marginBottom: 10,
},
// Weekly day selector
daySelector: {
  marginBottom: 20,
},
dayOption: {
  alignItems: 'center',
  backgroundColor: '#F0F0F0',
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 8,
  marginVertical: 6,
},
dayOptionSelected: {
  backgroundColor: '#007AFF',
},
dayText: {
  fontSize: 16,
  color: '#333',
  fontWeight: '500',
},
dayTextSelected: {
  color: '#FFF',
},
// Monthly day selector
dayOfMonthContainer: {
  marginBottom: 20,
},
dayOfMonthSelector: {
  flexDirection: 'row',
  flexWrap: 'wrap',
},
dayOfMonthOption: {
  width: 50,
  height: 40,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#F0F0F0',
  margin: 5,
  borderRadius: 8,
},
dayOfMonthSelected: {
  backgroundColor: '#007AFF',
},
dayOfMonthText: {
  fontSize: 16,
  color: '#333',
},
dayOfMonthTextSelected: {
  color: '#FFF',
  fontWeight: 'bold',
},
saveConfigButton: {
  backgroundColor: '#007AFF',
  padding: 16,
  borderRadius: 8,
  alignItems: 'center',
  marginTop: 20,
},
saveConfigButtonText: {
  color: '#FFF',
  fontSize: 16,
  fontWeight: 'bold',
},
});

export default AddTaskScreen;