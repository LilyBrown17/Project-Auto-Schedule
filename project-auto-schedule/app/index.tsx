import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Button, FlatList, TextInput, Platform, TouchableOpacity, ScrollView, KeyboardAvoidingView } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface EventItem {
  name: string;
  time: string;
  endTime?: string;
  location?: string;
  height?: number;
  id: string;
  originalId?: string;
  repeat?: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  date: string;
}

const MyCalendar = () => {
  const today = new Date();
  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(formatDate(today));
  const [items, setItems] = useState<Record<string, EventItem[]>>({ [formatDate(today)]: [] });
  const [eventName, setEventName] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [repeat, setRepeat] = useState<EventItem['repeat']>('none');
  const [weeklyDays, setWeeklyDays] = useState<string[]>([]);
  const [repeatEndDate, setRepeatEndDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [time, setTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showRepeatEndPicker, setShowRepeatEndPicker] = useState(false);
  const [confirmation, setConfirmation] = useState<{ type: 'delete' | 'edit'; event: EventItem } | null>(null);

  const STORAGE_KEY = 'calendar_events';

  const parseLocalDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setItems(JSON.parse(saved));
      } catch {}
    };
    loadEvents();
  }, []);

  useEffect(() => {
    const saveEvents = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {}
    };
    saveEvents();
  }, [items]);

  const generateRepeatDates = (start: string, repeatType: EventItem['repeat'], monthsAhead = 6) => {
    const dates: string[] = [];
    const startDate = parseLocalDate(start);
    const endDate = repeatEndDate ? parseLocalDate(repeatEndDate) : new Date();
    if (!repeatEndDate) endDate.setMonth(endDate.getMonth() + monthsAhead);
    let current = new Date(startDate);

    const stepMap: Record<string, number> = {
      daily: 1,
      weekly: 7,
      biweekly: 14,
      monthly: 0,
      yearly: 0,
    };

    if ((repeatType === 'weekly' || repeatType === 'biweekly') && weeklyDays.length > 0) {
      while (current <= endDate) {
        if (weeklyDays.includes(current.getDay().toString())) {
          dates.push(formatDate(current));
        }
        current.setDate(current.getDate() + 1);
      }
    } else {
      while (current <= endDate) {
        dates.push(formatDate(current));
        if (repeatType === 'daily') current.setDate(current.getDate() + 1);
        else if (repeatType === 'monthly') current.setMonth(current.getMonth() + 1);
        else if (repeatType === 'yearly') current.setFullYear(current.getFullYear() + 1);
        else break;
      }
    }

    return dates;
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'set' && selectedTime) {
      setTime(selectedTime);
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setEventTime(`${hours}:${minutes}`);
    }
  };

  const onEndTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') setShowEndPicker(false);
    if (event.type === 'set' && selectedTime) {
      setEndTime(selectedTime);
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setEventEndTime(`${hours}:${minutes}`);
    }
  };

  const onRepeatEndChange = (event: any, selected?: Date) => {
    setShowRepeatEndPicker(false);
    if (selected) setRepeatEndDate(formatDate(selected));
  };

  const addOrUpdateEvent = () => {
    if (!eventName || !eventTime) return;

    if (editingEvent) {
      setConfirmation({ type: 'edit', event: editingEvent });
      return;
    }

    const baseEvent = {
      name: eventName,
      time: eventTime,
      endTime: eventEndTime || undefined,
      location: eventLocation,
      height: 70,
      repeat,
    };

    const originalId = Math.random().toString();
    const dates = repeat && repeat !== 'none' ? generateRepeatDates(selectedDate, repeat) : [selectedDate];

    setItems((prev) => {
      const newItems = { ...prev };
      dates.forEach((d) => {
        if (!newItems[d]) newItems[d] = [];
        newItems[d].push({ ...baseEvent, id: Math.random().toString(), originalId, repeat, date: d });
      });
      return newItems;
    });

    setEventName('');
    setEventTime('');
    setEventEndTime('');
    setEventLocation('');
    setRepeat('none');
    setWeeklyDays([]);
    setRepeatEndDate(null);
  };

  const deleteEvent = (event: EventItem, allFuture = false) => {
    setItems((prev) => {
      const newItems: Record<string, EventItem[]> = { ...prev };
      if (event.repeat && event.repeat !== 'none' && allFuture && event.originalId) {
        Object.keys(newItems).forEach((d) => {
          if (parseLocalDate(d) >= parseLocalDate(event.date)) {
            newItems[d] = (newItems[d] || []).filter((e) => e.originalId !== event.originalId);
            if (newItems[d].length === 0) delete newItems[d];
          }
        });
      } else {
        newItems[event.date] = (newItems[event.date] || []).filter((e) => e.id !== event.id);
        if (newItems[event.date].length === 0) delete newItems[event.date];
      }
      return newItems;
    });

    setConfirmation(null);
    setEditingEvent(null);
    setEventName('');
    setEventTime('');
    setEventEndTime('');
    setEventLocation('');
    setRepeat('none');
    setWeeklyDays([]);
    setRepeatEndDate(null);
  };

  const editEventInstance = (event: EventItem, allFuture = false) => {
    setItems((prev) => {
      const newItems = { ...prev };
      if (event.repeat && event.repeat !== 'none' && allFuture && event.originalId) {
        Object.keys(newItems).forEach((d) => {
          if (parseLocalDate(d) >= parseLocalDate(event.date)) {
            newItems[d] = (newItems[d] || []).map((e) =>
              e.originalId === event.originalId
                ? { ...e, name: eventName, time: eventTime, endTime: eventEndTime || undefined, location: eventLocation }
                : e
            );
          }
        });
      } else {
        newItems[event.date] = (newItems[event.date] || []).map((e) =>
          e.id === event.id
            ? { ...e, name: eventName, time: eventTime, endTime: eventEndTime || undefined, location: eventLocation }
            : e
        );
      }
      return newItems;
    });

    setConfirmation(null);
    setEditingEvent(null);
    setEventName('');
    setEventTime('');
    setEventEndTime('');
    setEventLocation('');
    setRepeat('none');
    setWeeklyDays([]);
    setRepeatEndDate(null);
  };

  const askDeleteEvent = (event: EventItem) => {
    if (event.repeat && event.repeat !== 'none') setConfirmation({ type: 'delete', event });
    else deleteEvent(event);
  };

  const askEditEvent = (event: EventItem) => {
    if (event.repeat && event.repeat !== 'none') setConfirmation({ type: 'edit', event });
    else editEventInstance(event);
  };

  const markedDates = useMemo(() => {
    const marks: Record<string, { dots?: { key: string; color: string }[]; selected?: boolean; selectedColor?: string }> = {};

    Object.keys(items).forEach((date) => {
      const dots = [];
      if (items[date].some((e) => e.repeat && e.repeat !== 'none')) dots.push({ key: 'repeat', color: 'purple' });
      if (items[date].some((e) => !e.repeat || e.repeat === 'none')) dots.push({ key: 'single', color: 'green' });
      if (dots.length > 0) marks[date] = { dots };
    });

    marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: '#00adf5' };

    return marks;
  }, [items, selectedDate]);

  const renderItem = ({ item }: { item: EventItem }) => (
    <View style={{ padding: 10, backgroundColor: 'white', marginBottom: 10, borderRadius: 5 }}>
      <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
      <Text style={{ color: 'gray' }}>
        {item.time} {item.endTime ? `- ${item.endTime}` : ''}
      </Text>
      {item.location ? <Text style={{ color: 'gray' }}>{item.location}</Text> : null}
      {item.repeat && item.repeat !== 'none' ? <Text style={{ color: 'purple' }}>Repeats: {item.repeat}</Text> : null}
      <View style={{ flexDirection: 'row', marginTop: 5 }}>
        <TouchableOpacity onPress={() => askEditEvent(item)} style={{ marginRight: 15 }}>
          <Text style={{ color: 'blue' }}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => askDeleteEvent(item)}>
          <Text style={{ color: 'red' }}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <Calendar
          current={selectedDate}
          onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
          markedDates={markedDates}
          markingType="multi-dot"
          theme={{
            selectedDayBackgroundColor: '#00adf5',
            todayTextColor: '#00adf5',
            arrowColor: '#00adf5',
            monthTextColor: '#00adf5',
          }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginTop: 10 }}>
          <Text style={{ width: 80 }}>Name:</Text>
          <TextInput
            value={eventName}
            onChangeText={setEventName}
            style={{ borderWidth: 1, borderColor: '#ccc', padding: 8, flex: 1, borderRadius: 5 }}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginTop: 10 }}>
          <Text style={{ width: 80 }}>Location:</Text>
          <TextInput
            value={eventLocation}
            onChangeText={setEventLocation}
            style={{ borderWidth: 1, borderColor: '#ccc', padding: 8, flex: 1, borderRadius: 5 }}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginTop: 10 }}>
          <Text style={{ width: 80 }}>Start:</Text>
          {Platform.OS === 'web' ? (
            <input
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              style={{ padding: 8, borderRadius: 5, borderWidth: 1, borderColor: '#ccc', marginRight: 10, flex: 1 }}
            />
          ) : (
            <View style={{ flex: 1, marginRight: 10 }}>
              <Button title={eventTime ? eventTime : 'Pick Time'} onPress={() => setShowPicker(true)} />
            </View>
          )}
          <Text style={{ width: 80 }}>End:</Text>
          {Platform.OS === 'web' ? (
            <input
              type="time"
              value={eventEndTime}
              onChange={(e) => setEventEndTime(e.target.value)}
              style={{ padding: 8, borderRadius: 5, borderWidth: 1, borderColor: '#ccc', flex: 1 }}
            />
          ) : (
            <View style={{ flex: 1 }}>
              <Button title={eventEndTime ? eventEndTime : 'Pick Time'} onPress={() => setShowEndPicker(true)} />
            </View>
          )}
        </View>

        {showPicker && Platform.OS !== 'web' && (
          <DateTimePicker value={time} mode="time" is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onTimeChange} />
        )}
        {showEndPicker && Platform.OS !== 'web' && (
          <DateTimePicker value={endTime} mode="time" is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onEndTimeChange} />
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginTop: 10 }}>
          <Text>Repeat:</Text>
          {['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'].map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => setRepeat(option as EventItem['repeat'])}
              style={{ padding: 8, backgroundColor: repeat === option ? '#00adf5' : '#ccc', borderRadius: 5, marginLeft: 5 }}
            >
              <Text style={{ color: 'white', textTransform: 'capitalize' }}>{option}</Text>
            </TouchableOpacity>
          ))}

          {repeat !== 'none' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10 }}>
              <Text>End:</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={repeatEndDate || ''}
                  onChange={(e) => setRepeatEndDate(e.target.value)}
                  style={{ padding: 8, borderRadius: 5, borderWidth: 1, borderColor: '#ccc', marginLeft: 5 }}
                />
              ) : (
                <View style={{ marginLeft: 5 }}>
                  <Button title={repeatEndDate ? repeatEndDate : 'Pick Date'} onPress={() => setShowRepeatEndPicker(true)} />
                </View>
              )}
            </View>
          )}
        </View>

        {(repeat === 'weekly' || repeat === 'biweekly') && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 10, marginTop: 10 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() =>
                  setWeeklyDays((prev) => (prev.includes(idx.toString()) ? prev.filter((d) => d !== idx.toString()) : [...prev, idx.toString()]))
                }
                style={{ padding: 8, borderRadius: 5, backgroundColor: weeklyDays.includes(idx.toString()) ? '#00adf5' : '#ccc' }}
              >
                <Text style={{ color: 'white' }}>{day}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ marginHorizontal: 10, marginTop: 20 }}>
          <Button title={editingEvent ? 'Update Event' : 'Add Event'} onPress={addOrUpdateEvent} />
        </View>

        <FlatList data={items[selectedDate] || []} keyExtractor={(item) => item.id} renderItem={renderItem} contentContainerStyle={{ padding: 10 }} />

        {confirmation && (
          <View style={{ position: 'absolute', top: 150, left: 20, right: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#ccc', padding: 20, borderRadius: 10, zIndex: 1000 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>{confirmation.type === 'delete' ? 'Delete Repeating Event' : 'Edit Repeating Event'}</Text>
            <Text style={{ marginBottom: 10 }}>
              {confirmation.type === 'delete' ? 'Delete only this instance or all future events?' : 'Edit only this instance or all future events?'}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Button title="Cancel" onPress={() => setConfirmation(null)} />
              <Button
                title="Only this"
                onPress={() => {
                  if (confirmation.type === 'delete') deleteEvent(confirmation.event);
                  else editEventInstance(confirmation.event, false);
                }}
              />
              <Button
                title="All future"
                onPress={() => {
                  if (confirmation.type === 'delete') deleteEvent(confirmation.event, true);
                  else editEventInstance(confirmation.event, true);
                }}
              />
            </View>
          </View>
        )}

        {showRepeatEndPicker && Platform.OS !== 'web' && (
          <DateTimePicker value={repeatEndDate ? parseLocalDate(repeatEndDate) : new Date()} mode="date" display="default" onChange={onRepeatEndChange} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default function Index() {
  return <MyCalendar />;
}