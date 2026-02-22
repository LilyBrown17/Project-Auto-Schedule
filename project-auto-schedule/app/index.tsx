import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Button, FlatList, TextInput, Platform, Alert, TouchableOpacity } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface EventItem {
  name: string;
  time: string;
  location?: string;
  height?: number;
}

const MyCalendar = () => {
  const today = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [items, setItems] = useState<Record<string, EventItem[]>>({ [today]: [] });

  const [eventName, setEventName] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [time, setTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const STORAGE_KEY = 'calendar_events';

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setItems(JSON.parse(saved));
      } catch (error) {
        console.log('Failed to load events', error);
      }
    };
    loadEvents();
  }, []);

  useEffect(() => {
    const saveEvents = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (error) {
        console.log('Failed to save events', error);
      }
    };
    saveEvents();
  }, [items]);

  const onTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'set' && selectedTime) {
      setTime(selectedTime);
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setEventTime(`${hours}:${minutes}`);
    }
  };

  const addOrUpdateEvent = () => {
    if (!eventName || !eventTime) return;

    setItems(prev => {
      const dayItems = prev[selectedDate] || [];
      let newItems: EventItem[];
      if (editingIndex !== null) {
        newItems = [...dayItems];
        newItems[editingIndex] = { name: eventName, time: eventTime, location: eventLocation, height: 70 };
      } else {
        newItems = [...dayItems, { name: eventName, time: eventTime, location: eventLocation, height: 70 }];
      }
      newItems.sort((a, b) => a.time.localeCompare(b.time));
      return { ...prev, [selectedDate]: newItems };
    });

    setEventName('');
    setEventTime('');
    setEventLocation('');
    setEditingIndex(null);
  };

  const editEvent = (index: number) => {
    const event = items[selectedDate][index];
    setEventName(event.name);
    setEventTime(event.time);
    setEventLocation(event.location || '');
    setEditingIndex(index);
  };

  const deleteEvent = (index: number) => {
    Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setItems(prev => {
            const dayItems = [...(prev[selectedDate] || [])];
            dayItems.splice(index, 1);
            return { ...prev, [selectedDate]: dayItems };
          });
        },
      },
    ]);
  };

  const markedDates = useMemo(() => {
    const marks: Record<string, { marked?: boolean; selected?: boolean; selectedColor?: string }> = {};
    Object.keys(items).forEach(date => {
      if (items[date]?.length > 0) marks[date] = { marked: true };
    });
    marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: '#00adf5' };
    return marks;
  }, [items, selectedDate]);

  const renderItem = ({ item, index }: { item: EventItem; index: number }) => (
    <View style={{ padding: 10, backgroundColor: 'white', marginBottom: 10, borderRadius: 5 }}>
      <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
      <Text style={{ color: 'gray' }}>{item.time}</Text>
      {item.location ? <Text style={{ color: 'gray' }}>{item.location}</Text> : null}
      <View style={{ flexDirection: 'row', marginTop: 5 }}>
        <TouchableOpacity onPress={() => editEvent(index)} style={{ marginRight: 15 }}>
          <Text style={{ color: 'blue' }}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteEvent(index)}>
          <Text style={{ color: 'red' }}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
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

      <TextInput
        placeholder="Event name"
        value={eventName}
        onChangeText={setEventName}
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 8, margin: 10, borderRadius: 5 }}
      />

      <TextInput
        placeholder="Location"
        value={eventLocation}
        onChangeText={setEventLocation}
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 8, margin: 10, borderRadius: 5 }}
      />

      {Platform.OS === 'web' ? (
        <input
          type="time"
          value={eventTime}
          onChange={(e) => setEventTime(e.target.value)}
          style={{ margin: 10, padding: 8, borderRadius: 5, border: '1px solid #ccc' }}
        />
      ) : (
        <>
          <Button
            title={eventTime ? `Pick Time (${eventTime})` : 'Pick Time'}
            onPress={() => setShowPicker(true)}
          />
          {showPicker && (
            <DateTimePicker
              value={time}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
              style={{ marginVertical: 10 }}
            />
          )}
        </>
      )}

      <Button
        title={editingIndex !== null ? 'Update Event' : 'Add Event'}
        onPress={addOrUpdateEvent}
      />

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