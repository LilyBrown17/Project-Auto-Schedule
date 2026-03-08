import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  TextInput,
  Platform,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface EventItem {
  id: string;
  originalId?: string;
  name: string;
  type?: 'normal' | 'reminder';
  time?: string;
  endTime?: string;
  location?: string;
  repeat?: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  date: string;
  weeklyDays?: string[];
  height?: number;
  reminderAssignedTime?: string;
}

const STORAGE_KEY = 'calendar_events';

const MyCalendar = () => {
  const today = new Date();
  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

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
  const [eventType, setEventType] = useState<'normal' | 'reminder'>('normal');
  const [time, setTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showRepeatEndPicker, setShowRepeatEndPicker] = useState(false);
  const [confirmation, setConfirmation] = useState<{ type: 'delete' | 'edit'; event: EventItem } | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [reminderPopup, setReminderPopup] = useState<string | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);

  const parseLocalDate = (dateString: string) => {
    const [y, m, d] = dateString.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const resetForm = () => {
    setEditingEvent(null);
    setEventName('');
    setEventTime('');
    setEventEndTime('');
    setEventLocation('');
    setRepeat('none');
    setWeeklyDays([]);
    setRepeatEndDate(null);
    setConfirmation(null);
    setEventType('normal');
    setTimeError(null);
    setReminderPopup(null);
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
    let endDate = repeatEndDate ? parseLocalDate(repeatEndDate) : new Date();
    if (!repeatEndDate) {
      if (repeatType === 'monthly' || repeatType === 'yearly') endDate.setFullYear(endDate.getFullYear() + 5);
      else endDate.setMonth(endDate.getMonth() + monthsAhead);
    }
    let current = new Date(startDate);

    if ((repeatType === 'weekly' || repeatType === 'biweekly') && weeklyDays.length > 0) {
      while (current <= endDate) {
        if (weeklyDays.includes(current.getDay().toString())) dates.push(formatDate(current));
        current.setDate(current.getDate() + 1);
      }
    } else {
      while (current <= endDate) {
        dates.push(formatDate(current));
        switch (repeatType) {
          case 'daily':
            current.setDate(current.getDate() + 1);
            break;
          case 'weekly':
            current.setDate(current.getDate() + 7);
            break;
          case 'biweekly':
            current.setDate(current.getDate() + 14);
            break;
          case 'monthly':
            current.setMonth(current.getMonth() + 1);
            break;
          case 'yearly':
            current.setFullYear(current.getFullYear() + 1);
            break;
          default:
            current = new Date(endDate.getTime() + 1);
        }
      }
    }
    return dates;
  };

  const findNextAvailableTime = (date: string): { date: string; time: string } => {
    const startHour = 9;
    const endHour = 18;
    let checkDate = parseLocalDate(date);

    while (true) {
      const dateStr = formatDate(checkDate);
      const occupied = (items[dateStr] || []).filter(e => e.time).map(e => e.time);
      for (let h = startHour; h < endHour; h++) {
        for (let m = 0; m < 60; m += 30) {
          const candidate = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
          if (!occupied.includes(candidate)) return { date: dateStr, time: candidate };
        }
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }
  };

  const onTimeChange = (e: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (e.type === 'set' && selected) {
      setTime(selected);
      const h = selected.getHours().toString().padStart(2, '0');
      const m = selected.getMinutes().toString().padStart(2, '0');
      setEventTime(`${h}:${m}`);
      setTimeError(null);
    }
  };

  const onEndTimeChange = (e: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowEndPicker(false);
    if (e.type === 'set' && selected) {
      setEndTime(selected);
      const h = selected.getHours().toString().padStart(2, '0');
      const m = selected.getMinutes().toString().padStart(2, '0');
      setEventEndTime(`${h}:${m}`);
      setTimeError(null);
    }
  };

  const onRepeatEndChange = (e: any, selected?: Date) => {
    setShowRepeatEndPicker(false);
    if (selected) setRepeatEndDate(formatDate(selected));
  };

  const addOrUpdateEvent = () => {
    if (!eventName) return;
    if (eventType === 'normal' && !eventTime) return;

    let endTimeFinal =
      eventType === 'normal'
        ? eventEndTime ||
          (() => {
            const [h, m] = (eventTime || '09:00').split(':').map(Number);
            let endH = h,
              endM = m + 30;
            if (endM >= 60) {
              endH += 1;
              endM -= 60;
            }
            return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
          })()
        : undefined;

    if (endTimeFinal && eventTime && endTimeFinal <= eventTime) {
      setTimeError('End time must be after start time.');
      return;
    }

    const originalId = editingEvent?.originalId || Math.random().toString();
    const baseEvent: EventItem = {
      id: editingEvent?.id || Math.random().toString(),
      originalId,
      name: eventName,
      type: eventType,
      time: eventTime,
      endTime: endTimeFinal,
      location: eventLocation,
      repeat: eventType === 'normal' ? repeat : 'none',
      weeklyDays: eventType === 'normal' ? weeklyDays : undefined,
      height: 70,
      date: selectedDate,
      reminderAssignedTime: undefined,
    };

    const dates =
      baseEvent.repeat && baseEvent.repeat !== 'none' ? generateRepeatDates(selectedDate, baseEvent.repeat) : [selectedDate];

    if (eventType === 'reminder') {
      const { date: assignedDate, time: assignedTime } = findNextAvailableTime(selectedDate);
      baseEvent.time = assignedTime;
      baseEvent.reminderAssignedTime = assignedTime;
      setSelectedDate(assignedDate);
      setReminderPopup(`Reminder assigned at ${assignedTime} on ${assignedDate}`);
      setShowReminderModal(true);
      baseEvent.endTime = undefined;
      dates.length = 0;
      dates.push(assignedDate);
    }

    setItems(prev => {
      const newItems = { ...prev };
      dates.forEach(d => {
        if (!newItems[d]) newItems[d] = [];
        newItems[d].push({ ...baseEvent, date: d });
      });
      return newItems;
    });

    resetForm();
  };

  const deleteEvent = (event: EventItem, allFuture = false) => {
    setItems(prev => {
      const newItems = { ...prev };
      if (event.repeat && event.repeat !== 'none' && allFuture && event.originalId) {
        Object.keys(newItems).forEach(d => {
          if (parseLocalDate(d) >= parseLocalDate(event.date)) {
            newItems[d] = (newItems[d] || []).filter(e => e.originalId !== event.originalId);
            if (!newItems[d].length) delete newItems[d];
          }
        });
      } else {
        newItems[event.date] = (newItems[event.date] || []).filter(e => e.id !== event.id);
        if (!newItems[event.date].length) delete newItems[event.date];
      }
      return newItems;
    });
    resetForm();
  };

  const startEditingEvent = (event: EventItem) => {
    setEditingEvent(event);
    setEventName(event.name);
    setEventTime(event.time || '');
    setEventEndTime(event.endTime || '');
    setEventLocation(event.location || '');
    setRepeat(event.repeat || 'none');
    setWeeklyDays(event.weeklyDays || []);
    setRepeatEndDate(repeatEndDate || null);
    setEventType(event.type || 'normal');
    setConfirmation(null);
  };

  const editEventInstance = (event: EventItem, allFuture = false) => {
    setItems(prev => {
      const newItems = { ...prev };
      if (event.repeat && event.repeat !== 'none' && allFuture && event.originalId) {
        Object.keys(newItems).forEach(d => {
          if (parseLocalDate(d) >= parseLocalDate(event.date)) {
            newItems[d] = (newItems[d] || []).map(e =>
              e.originalId === event.originalId
                ? { ...e, name: eventName, time: eventTime, endTime: eventEndTime, location: eventLocation, weeklyDays }
                : e
            );
          }
        });
      } else {
        newItems[event.date] = (newItems[event.date] || []).map(e =>
          e.id === event.id ? { ...e, name: eventName, time: eventTime, endTime: eventEndTime, location: eventLocation, weeklyDays } : e
        );
      }
      return newItems;
    });
    resetForm();
  };

  const askDeleteEvent = (event: EventItem) => setConfirmation({ type: 'delete', event });
  const askEditEvent = (event: EventItem) => setConfirmation({ type: 'edit', event });

  const markedDates = useMemo(() => {
    const marks: Record<string, { dots?: { key: string; color: string }[]; selected?: boolean; selectedColor?: string }> = {};
    Object.keys(items).forEach(date => {
      const dots = [];
      if (items[date].some(e => e.repeat && e.repeat !== 'none')) dots.push({ key: 'repeat', color: 'purple' });
      if (items[date].some(e => !e.repeat || e.repeat === 'none') && items[date].some(e => e.type === 'normal'))
        dots.push({ key: 'single', color: 'green' });
      if (items[date].some(e => e.type === 'reminder')) dots.push({ key: 'reminder', color: 'red' });
      if (dots.length) marks[date] = { dots };
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
        borderLeftWidth: item.type === 'reminder' ? 5 : 0,
        borderLeftColor: item.type === 'reminder' ? 'red' : 'transparent',
      }}
    >
      <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
      {item.time ? (
        <Text style={{ color: 'gray' }}>
          {item.time} {item.endTime ? `- ${item.endTime}` : ''}
        </Text>
      ) : null}
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

        <View style={{ flexDirection: 'row', marginHorizontal: 10, marginTop: 10 }}>
          {['normal', 'reminder'].map(type => (
            <TouchableOpacity
              key={type}
              onPress={() => setEventType(type as 'normal' | 'reminder')}
              style={{ padding: 8, backgroundColor: eventType === type ? '#00adf5' : '#ccc', borderRadius: 5, marginRight: 10 }}
            >
              <Text style={{ color: 'white', textTransform: 'capitalize' }}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>

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

        {eventType === 'normal' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginTop: 10 }}>
            <Text style={{ width: 80 }}>Start:</Text>
            {Platform.OS === 'web' ? (
              <input
                type="time"
                value={eventTime}
                onChange={e => {
                  setEventTime(e.target.value);
                  setTimeError(null);
                }}
                style={{
                  padding: 8,
                  borderRadius: 5,
                  borderWidth: 1,
                  borderColor: timeError ? 'red' : '#ccc',
                  marginRight: 10,
                  flex: 1,
                }}
              />
            ) : (
              <View style={{ flex: 1, marginRight: 10 }}>
                <Button title={eventTime || 'Pick Time'} onPress={() => setShowPicker(true)} />
              </View>
            )}
            <Text style={{ width: 80 }}>End:</Text>
            {Platform.OS === 'web' ? (
              <input
                type="time"
                value={eventEndTime}
                onChange={e => {
                  setEventEndTime(e.target.value);
                  setTimeError(null);
                }}
                style={{ padding: 8, borderRadius: 5, borderWidth: 1, borderColor: timeError ? 'red' : '#ccc', flex: 1 }}
              />
            ) : (
              <View style={{ flex: 1 }}>
                <Button title={eventEndTime || 'Pick Time'} onPress={() => setShowEndPicker(true)} />
              </View>
            )}
          </View>
        )}

        {timeError && <Text style={{ color: 'red', marginHorizontal: 10, marginTop: 5 }}>{timeError}</Text>}

        <Modal visible={showReminderModal} transparent animationType="fade">
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10 }}>
              <Text>{reminderPopup}</Text>
              <Button title="OK" onPress={() => setShowReminderModal(false)} />
            </View>
          </View>
        </Modal>

        {showPicker && <DateTimePicker value={time} mode="time" display="default" onChange={onTimeChange} />}
        {showEndPicker && <DateTimePicker value={endTime} mode="time" display="default" onChange={onEndTimeChange} />}
        {showRepeatEndPicker && <DateTimePicker value={time} mode="date" display="default" onChange={onRepeatEndChange} />}

        {eventType === 'normal' && (
          <View style={{ margin: 10 }}>
            <Text style={{ marginBottom: 5 }}>Repeat:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'].map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRepeat(r as EventItem['repeat'])}
                  style={{
                    padding: 8,
                    backgroundColor: repeat === r ? '#00adf5' : '#ccc',
                    borderRadius: 5,
                    marginRight: 5,
                    marginBottom: 5,
                  }}
                >
                  <Text style={{ color: 'white', textTransform: 'capitalize' }}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {repeat === 'weekly' && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 }}>
                {Array.from({ length: 7 }, (_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() =>
                      setWeeklyDays(prev => (prev.includes(i.toString()) ? prev.filter(d => d !== i.toString()) : [...prev, i.toString()]))
                    }
                    style={{
                      padding: 8,
                      backgroundColor: weeklyDays.includes(i.toString()) ? '#00adf5' : '#ccc',
                      borderRadius: 5,
                      marginRight: 5,
                      marginBottom: 5,
                    }}
                  >
                    <Text style={{ color: 'white' }}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'][i]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ margin: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Button title={editingEvent ? 'Update Event' : 'Add Event'} onPress={addOrUpdateEvent} />
          <Button title="Reset" onPress={resetForm} color="gray" />
        </View>

        <FlatList data={items[selectedDate] || []} keyExtractor={item => item.id} renderItem={renderItem} />

        {confirmation && (
          <View
            style={{
              position: 'absolute',
              top: 100,
              left: 20,
              right: 20,
              padding: 20,
              backgroundColor: 'white',
              borderRadius: 10,
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 5,
              elevation: 5,
            }}
          >
            <Text style={{ marginBottom: 10 }}>
              {confirmation.type === 'delete' ? 'Delete this event?' : 'Edit this event?'}
            </Text>
            {confirmation.event.repeat && confirmation.event.repeat !== 'none' ? (
              <Text style={{ marginBottom: 10 }}>This is a repeating event. Apply to only this instance or all future?</Text>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {confirmation.type === 'delete' ? (
                <>
                  {!confirmation.event.repeat || confirmation.event.repeat === 'none' || confirmation.event.type === 'reminder' ? (
                    <>
                      <Button title="Confirm" onPress={() => deleteEvent(confirmation.event)} />
                      <Button title="Cancel" onPress={resetForm} color="gray" />
                    </>
                  ) : (
                    <>
                      <Button title="Only this" onPress={() => deleteEvent(confirmation.event, false)} />
                      <Button title="All future" onPress={() => deleteEvent(confirmation.event, true)} />
                      <Button title="Cancel" onPress={resetForm} color="gray" />
                    </>
                  )}
                </>
              ) : (
                <>
                  {!confirmation.event.repeat || confirmation.event.repeat === 'none' ? (
                    <>
                      <Button title="Yes" onPress={() => startEditingEvent(confirmation.event)} />
                      <Button title="Cancel" onPress={resetForm} color="gray" />
                    </>
                  ) : (
                    <>
                      <Button title="Only this" onPress={() => startEditingEvent(confirmation.event)} />
                      <Button title="All future" onPress={() => startEditingEvent(confirmation.event)} />
                      <Button title="Cancel" onPress={resetForm} color="gray" />
                    </>
                  )}
                </>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default function Index() {
  return <MyCalendar />;
}