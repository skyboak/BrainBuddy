// src/components/FilterBar.tsx

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FilterOption {
  key: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface FilterBarProps {
  activeFilter: string;
  onFilterChange: (filterKey: string) => void;
  filters: FilterOption[];
}

const FilterBar: React.FC<FilterBarProps> = ({
  activeFilter,
  onFilterChange,
  filters,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              activeFilter === filter.key && styles.activeFilterButton,
            ]}
            onPress={() => onFilterChange(filter.key)}
            activeOpacity={0.7}
          >
            {filter.icon && (
              <Ionicons
                name={filter.icon}
                size={16}
                color={activeFilter === filter.key ? '#007AFF' : '#666666'}
                style={styles.filterIcon}
              />
            )}
            <Text
              style={[
                styles.filterText,
                activeFilter === filter.key && styles.activeFilterText,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: '#F0F0F0',
  },
  activeFilterButton: {
    backgroundColor: '#E9F0FF',
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  activeFilterText: {
    color: '#007AFF',
  },
  filterIcon: {
    marginRight: 6,
  },
});

export default FilterBar;