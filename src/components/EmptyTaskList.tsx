// src/components/EmptyTaskList.tsx

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface EmptyTaskListProps {
  filter: string;
}

const EmptyTaskList: React.FC<EmptyTaskListProps> = ({ filter }) => {
  // Get the message based on the filter
  const getMessage = (): { title: string; description: string } => {
    switch (filter) {
      case 'today':
        return {
          title: 'No tasks for today',
          description: 'Your schedule is clear for today. Tap "+" to add a new task.',
        };
      case 'week':
        return {
          title: 'No tasks for this week',
          description: 'Nothing due in the next 7 days. Maybe add some weekly goals?',
        };
      case 'month':
        return {
          title: 'No tasks for this month',
          description: 'Your monthly schedule is empty. Add some long-term tasks.',
        };
      default:
        return {
          title: 'No tasks found',
          description: 'Your task list is empty. Add a task to get started!',
        };
    }
  };
  
  const message = getMessage();
  
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/empty-tasks.png')}
        style={styles.image}
        resizeMode="contain"
      />
      <Text style={styles.title}>{message.title}</Text>
      <Text style={styles.description}>{message.description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 50,
  },
  image: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default EmptyTaskList;