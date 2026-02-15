import React, { useState, useMemo } from 'react';
import { View, Text, Button, FlatList } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';

interface EventItem {
  name: string;
  height?: number;
}

const MyCalendar = () => {
  const today = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [items, setItems] = useState<Record<string, EventItem[]>>({ [today]: [] });

  const addEvent = () => {
    setItems(prev => {
      const dayItems = prev[selectedDate] || [];
      return {
        ...prev,
        [selectedDate]: [...dayItems, { name: `New Event on ${selectedDate}`, height: 70 }],
      };
    });
  };

  const markedDates = useMemo(() => {
    const marks: Record<string, { marked?: boolean; selected?: boolean; selectedColor?: string }> = {};

    Object.keys(items).forEach(date => {
      if (items[date]?.length > 0) {
        marks[date] = { marked: true };
      }
    });

    marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: '#00adf5' };
    return marks;
  }, [items, selectedDate]);

  const renderItem = ({ item }: { item: EventItem }) => (
    <View
      style={{
        padding: 10,
        backgroundColor: 'white',
        marginBottom: 10,
        borderRadius: 5,
      }}
    >
      <Text>{item.name}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, paddingTop: 50 }}>
      <Calendar
        current={selectedDate}
        onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
        markedDates={markedDates}
        theme={{
          selectedDayBackgroundColor: '#00adf5',
          todayTextColor: '#00adf5',
          arrowColor: '#00adf5',
          monthTextColor: '#00adf5',
        }}
      />

      <Button title="Add Event" onPress={addEvent} />

      <FlatList
        data={items[selectedDate] || []}
        keyExtractor={(_, index) => `${selectedDate}-${index}`}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 10 }}
      />
    </View>
  );
};

export default function Index() {
  return <MyCalendar />;
}
