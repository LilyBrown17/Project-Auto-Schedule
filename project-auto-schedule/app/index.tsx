import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Button, FlatList, TextInput, Platform, TouchableOpacity, ScrollView, KeyboardAvoidingView, Modal } from 'react-native';
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
  reminderAssignedTime?: string;
  repeatEndDate?: string;
  reminderDays?: string[];
  reminderMaxDate?: string;
  reminderStartTime?: string;
  reminderEndTime?: string;
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
  const [repeatEndDateObj, setRepeatEndDateObj] = useState(new Date());
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [editAllFuture, setEditAllFuture] = useState(false);
  const [eventType, setEventType] = useState<'normal' | 'reminder'>('normal');
  const [time, setTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showRepeatEndPicker, setShowRepeatEndPicker] = useState(false);
  const [confirmation, setConfirmation] = useState<{ type: 'delete' | 'edit'; event: EventItem } | null>(null);
  const [formErrors, setFormErrors] = useState<{time?: string, date?: string, general?: string}>({});
  const [reminderPopup, setReminderPopup] = useState<string | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);

  const createId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

  const parseLocalDate = (dateString: string) => {
    const [y, m, d] = dateString.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const resetForm = () => {
    setEditingEvent(null);
    setEditAllFuture(false);
    setEventName('');
    setEventTime('');
    setEventEndTime('');
    setEventLocation('');
    setRepeat('none');
    setWeeklyDays([]);
    setRepeatEndDate(null);
    setConfirmation(null);
    setEventType('normal');
    setFormErrors({});
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
      } catch (err) {
        console.error("Failed to save events", err);
      }
    };

    const timeout = setTimeout(saveEvents, 300);
    return () => clearTimeout(timeout);
  }, [items]);

  const generateRepeatDates = (start: string, repeatType: EventItem['repeat'], repeatEnd?: string, monthsAhead = 6) => {
    const dates: string[] = [];
    const startDate = parseLocalDate(start);

    let endDate = repeatEnd ? parseLocalDate(repeatEnd) : new Date();
    if (!repeatEnd) {
      if (repeatType === 'monthly' || repeatType === 'yearly') endDate.setFullYear(endDate.getFullYear() + 5);
      else endDate.setMonth(endDate.getMonth() + monthsAhead);
    }
    let current = new Date(startDate);

    if ((repeatType === 'weekly' || repeatType === 'biweekly') && weeklyDays.length > 0) {
      const interval = repeatType === 'biweekly' ? 14 : 7;

      while (current <= endDate) {
        weeklyDays.forEach(day => {
          const target = new Date(current);
          let diff = Number(day) - target.getDay();
          if (diff < 0) diff += 7;
          target.setDate(target.getDate() + diff);

          if (target >= startDate && target <= endDate) {
            const formatted = formatDate(target);

            if (!dates.includes(formatted)) {
              dates.push(formatted);
            }
          }
        });

        current.setDate(current.getDate() + interval);
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
    return dates.sort((a, b) => a.localeCompare(b));
  };

  const findNextAvailableTime = (
    date: string, 
    constraints: { days?: string[], maxDate?: string, startTime?: string, endTime?: string }
): { date: string; time: string } | null => {
  
    const startHour = constraints.startTime ? parseInt(constraints.startTime.split(':')[0]) : 9;
    const startMinute = constraints.startTime ? parseInt(constraints.startTime.split(':')[1]) : 0;
    const endHour = constraints.endTime ? parseInt(constraints.endTime.split(':')[0]) : 18;
    const endMinute = constraints.endTime ? parseInt(constraints.endTime.split(':')[1]) : 0;

    let checkDate = parseLocalDate(date);
    const maxDateLimit = constraints.maxDate ? parseLocalDate(constraints.maxDate) : null;
    let safety = 0;

    while (safety < 3650) {
      safety++;
      const dateStr = formatDate(checkDate);
    
      if (maxDateLimit && checkDate > maxDateLimit) return null;

      const dayOfWeek = checkDate.getDay().toString();
      if (constraints.days && constraints.days.length > 0 && !constraints.days.includes(dayOfWeek)) {
        checkDate.setDate(checkDate.getDate() + 1);
        continue;
      }

      const events = items[dateStr] || [];
    
      for (let h = startHour; h <= endHour; h++) {
        for (let m = (h === startHour ? startMinute : 0); m < 60; m += 30) {
          const candidateMinutes = h * 60 + m;
          if (candidateMinutes > (endHour * 60 + endMinute)) break;

          const candidate = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        
          const overlaps = events.some(e => {
            if (!e.time) return false;
            const [sh, sm] = e.time.split(':').map(Number);
            const start = sh * 60 + sm;
            const [eh, em] = (e.endTime || e.time).split(':').map(Number);
            let end = e.endTime ? eh * 60 + em : start + 30;
            return candidateMinutes >= start && candidateMinutes < end;
          });

          if (!overlaps) return { date: dateStr, time: candidate };
        }
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }
    return null;
  };

  const onTimeChange = (e: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (e.type === 'set' && selected) {
      setTime(selected);
      const h = selected.getHours().toString().padStart(2, '0');
      const m = selected.getMinutes().toString().padStart(2, '0');
      setEventTime(`${h}:${m}`);
    }
  };

  const onEndTimeChange = (e: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowEndPicker(false);
    if (e.type === 'set' && selected) {
      setEndTime(selected);
      const h = selected.getHours().toString().padStart(2, '0');
      const m = selected.getMinutes().toString().padStart(2, '0');
      setEventEndTime(`${h}:${m}`);
    }
  };

  const onRepeatEndChange = (e: any, selected?: Date) => {
    setShowRepeatEndPicker(false);

    if (selected) {
      const start = parseLocalDate(selectedDate);
      
      setRepeatEndDate(formatDate(selected));
      setRepeatEndDateObj(selected);
    }
  };

  const getValidationErrors = () => {
    const errors: {time?: string, date?: string, general?: string} = {};
  
    const toMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    if (!eventName.trim()) errors.general = "Event name is required.";

    if (eventType === 'normal') {
      if (!eventTime) {
        errors.time = "Start time is required.";
      } else if (eventEndTime && toMinutes(eventEndTime) <= toMinutes(eventTime)) {
        errors.time = "End time must be after start time.";
      }
    }

    const startDay = parseLocalDate(selectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDay < today) {
      errors.date = "Cannot schedule in the past.";
    }

    if (eventType === 'normal' && repeat !== 'none' && repeatEndDate) {
      if (parseLocalDate(repeatEndDate) < startDay) {
        errors.date = "End date must be after start date.";
      }
    }

    return errors;
  };

  const addOrUpdateEvent = () => {
    if (!eventName) return;
    if (eventType === 'normal' && !eventTime) return;

    if (editingEvent) {
      editEventInstance(editingEvent, editAllFuture);
      return;
    }

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
    
    const toMinutes = (t:string)=>{
      const [h,m] = t.split(':').map(Number);
      return h*60+m;
    }

    const errors = getValidationErrors();
  
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    const originalId = createId();
    const baseEvent: EventItem = {
      id: createId(),
      originalId,
      name: eventName,
      type: eventType,
      time: eventTime,
      endTime: endTimeFinal,
      location: eventLocation,
      repeat: eventType === 'normal' ? repeat : 'none',
      weeklyDays: eventType === 'normal' ? weeklyDays : undefined,
      date: selectedDate,
      reminderAssignedTime: undefined,
      repeatEndDate: repeatEndDate || undefined,
    };

    const dates = baseEvent.repeat && baseEvent.repeat !== 'none' ? generateRepeatDates(selectedDate, baseEvent.repeat, baseEvent.repeatEndDate) : [selectedDate];

    if (eventType === 'reminder') {
      const result = findNextAvailableTime(selectedDate, {
        days: weeklyDays,
        maxDate: repeatEndDate || undefined,
        startTime: eventTime || '09:00',
        endTime: eventEndTime || '18:00'
      });

      if (result) {
        const { date: assignedDate, time: assignedTime } = result;
        baseEvent.time = assignedTime;
        baseEvent.date = assignedDate;
      } else {
        setFormErrors({ general: "No available slot found within your constraints." });
        return;
      }
    }

    setItems(prev => {
      const newItems = {...prev};
      dates.forEach(d => {
        if (!newItems[d]) newItems[d] = [];
        const exists = newItems[d].some(e =>
          e.originalId === baseEvent.originalId && e.time === baseEvent.time
        );
        if (!exists) {
          newItems[d].push({ ...baseEvent, id: createId(), date: d });
        }
      });
      return newItems;
    });

    resetForm();
  };

  const deleteEvent = (event: EventItem, allFuture = false) => {
    setItems(prev => {
      const newItems = {...prev};
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
    setRepeatEndDate(event.repeatEndDate || null);
    setEventType(event.type || 'normal');
    setConfirmation(null);
    if (event.repeatEndDate) {
      const d = parseLocalDate(event.repeatEndDate);
      setRepeatEndDateObj(d);
    }
    if (event.time) {
      const [h, m] = event.time.split(':').map(Number);
      const newDate = new Date();
      newDate.setHours(h, m);
      setTime(newDate);
    }
  };

  const editEventInstance = (event: EventItem, allFuture = false) => {
    const toMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const errors = getValidationErrors();
  
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    setItems(prev => {
      const newItems = {...prev};
      if (event.repeat && event.repeat !== 'none' && allFuture && event.originalId) {
        Object.keys(newItems).forEach(d => {
          if (parseLocalDate(d) >= parseLocalDate(event.date)) {
            newItems[d] = (newItems[d] || []).filter(
              e => e.originalId !== event.originalId
            );

            if (!newItems[d].length) delete newItems[d];
          }
        });

        const newDates = generateRepeatDates(
          event.date,
          repeat,
          repeatEndDate || undefined
        );

        newDates.forEach(d => {
          if (!newItems[d]) newItems[d] = [];

          newItems[d].push({
            ...event,
            id: createId(),
            date: d,
            name: eventName,
            time: eventTime,
            endTime: eventEndTime,
            location: eventLocation,
            repeat,
            weeklyDays,
            repeatEndDate: repeatEndDate || undefined
          });
        });
      } else {
        newItems[event.date] = (newItems[event.date] || []).map(e =>
          e.id === event.id ? { 
            ...e, 
            name: eventName, 
            time: event.type === 'reminder' ? event.time : eventTime,
            endTime: event.type === 'reminder' ? undefined : eventEndTime, 
            location: eventLocation, 
            weeklyDays 
          } : e
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

        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginTop: 10 }}>
          <Text style={{ width: 80 }}>{eventType === 'normal' ? 'Start Time:' : 'Earliest:'}</Text>
          {Platform.OS === 'web' ? (
            <input
              type="time"
              value={eventTime}
              onChange={e => {                  
                setEventTime(e.target.value);
                setFormErrors({});
              }}
              style={{
                padding: 8,
                borderRadius: 5,
                borderWidth: 1,
                borderColor: formErrors ? 'red' : '#ccc',
                marginRight: 10,                  
                flex: 1,
              }}
            />
          ) : (
            <View style={{ flex: 1, marginRight: 10 }}>
              <Button title={eventTime || 'Pick Time'} onPress={() => setShowPicker(true)} />
            </View>
          )}
          <Text style={{ width: 80 }}>{eventType === 'normal' ? 'End Time:' : 'Latest:'}</Text>
          {Platform.OS === 'web' ? (
            <input
              type="time"
              value={eventEndTime}
              onChange={e => {
                setEventEndTime(e.target.value);
                setFormErrors({});
              }}
              style={{ padding: 8, borderRadius: 5, borderWidth: 1, borderColor: formErrors ? 'red' : '#ccc', flex: 1 }}
            />
          ) : (
            <View style={{ flex: 1 }}>
              <Button title={eventEndTime || 'Pick Time'} onPress={() => setShowEndPicker(true)} />
            </View>
          )}
        </View>

        {eventType === 'normal' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginTop: 10 }}>
            <Text style={{ width: 80 }}>Repeat:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
              {['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'].map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRepeat(r as EventItem['repeat'])}
                  style={{
                    padding: 8,
                    backgroundColor: repeat === r ? '#00adf5' : '#ccc',
                    borderRadius: 5,
                    marginRight: 5,
                  }}
                >
                  <Text style={{ color: 'white', textTransform: 'capitalize' }}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {(repeat !== 'none' || eventType === 'reminder') && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginTop: 10 }}>
            <Text style={{ width: 80 }}>{eventType === 'normal' ? 'End Date:' : 'Last Date:'}</Text>  
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={repeatEndDate || ""}
                onChange={(e) => {
                  setRepeatEndDate(e.target.value);
                  setRepeatEndDateObj(new Date(e.target.value));
                }}
                style={{
                  padding: 8,
                  borderRadius: 5,
                  borderWidth: 1,
                  borderColor: formErrors ? 'red' : '#ccc',
                  marginRight: 10,                  
                  flex: 1,
                }}
              />
            ) : (
              <TouchableOpacity
                onPress={() => setShowRepeatEndPicker(true)}
                style={{
                  padding: 8,
                  borderRadius: 5,
                  borderWidth: 1,
                  borderColor: formErrors.date ? 'red' : '#ccc',
                  flex: 1,
                }}
              >
                <Text>{repeatEndDate || 'Select Date'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {(repeat === 'weekly' || repeat === 'biweekly' || eventType === 'reminder') && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginTop: 10 }}>
            <Text style={{ width: 80 }}>Days:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
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
                    marginBottom: 5
                  }}
                >
                  <Text style={{ color: 'white' }}>{day}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ margin: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Button title={editingEvent ? 'Update Event' : 'Add Event'} onPress={addOrUpdateEvent} />
          <Button title="Reset" onPress={resetForm} color="gray" />
        </View>

        {formErrors && <Text style={{ color: 'red', fontSize: 12, marginHorizontal: 10, marginTop: 5 }}>{formErrors.time}</Text>}
        {formErrors && (<Text style={{ color: 'red', fontSize: 12, marginHorizontal: 10, marginTop: 5 }}>{formErrors.date}</Text>)}

        {showPicker && <DateTimePicker value={time} mode="time" display="default" onChange={onTimeChange} />}
        {showEndPicker && <DateTimePicker value={endTime} mode="time" display="default" onChange={onEndTimeChange} />}
        {showRepeatEndPicker && <DateTimePicker value={repeatEndDateObj} mode="date" display="default" onChange={onRepeatEndChange} />}

        <FlatList data={[...(items[selectedDate] || [])].sort((a, b) =>  {
          if (!a.time) return 1;
          if (!b.time) return -1;
          return a.time.localeCompare(b.time);
        })} keyExtractor={item => item.id} renderItem={renderItem} />

      </ScrollView>
      <Modal visible={!!confirmation} transparent animationType="fade" onRequestClose={resetForm}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.3)',
          }}
        >
          <View
            style={{
              backgroundColor: 'white',
              padding: 20,
              borderRadius: 10,
              width: '85%',
            }}
          >
            <Text style={{ marginBottom: 10 }}>
              {confirmation?.type === 'delete'
                ? 'Delete this event?'
                : 'Edit this event?'}
            </Text>

            {confirmation?.event.repeat &&
            confirmation?.event.repeat !== 'none' ? (
              <Text style={{ marginBottom: 10 }}>
                This is a repeating event. Apply to only this instance or all future?
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {confirmation?.type === 'delete' ? (
                <>
                  {!confirmation?.event.repeat ||
                  confirmation?.event.repeat === 'none' ||
                  confirmation?.event.type === 'reminder' ? (
                    <>
                      <Button
                        title="Confirm"
                        onPress={() => {if (confirmation) deleteEvent(confirmation.event);}}
                      />
                      <Button title="Cancel" onPress={resetForm} color="gray" />
                    </>
                  ) : (
                    <>
                      <Button
                        title="Only this"
                        onPress={() => {if (confirmation) deleteEvent(confirmation.event, false);}}
                      />
                      <Button
                        title="All future"
                        onPress={() => {if (confirmation) deleteEvent(confirmation.event, true);}}
                      />
                      <Button title="Cancel" onPress={resetForm} color="gray" />
                    </>
                  )}
                </>
              ) : (
                <>
                  {!confirmation?.event.repeat ||
                  confirmation?.event.repeat === 'none' ? (
                    <>
                      <Button
                        title="Yes"
                        onPress={() => {if (confirmation) startEditingEvent(confirmation.event);}}
                      />
                      <Button title="Cancel" onPress={resetForm} color="gray" />
                    </>
                  ) : (
                    <>
                      <Button
                        title="Only this"
                        onPress={() => {
                          setEditAllFuture(false);
                          if (confirmation) startEditingEvent(confirmation.event);
                        }}
                      />
                      <Button
                        title="All future"
                        onPress={() => {
                          setEditAllFuture(true);
                          if (confirmation) startEditingEvent(confirmation.event);
                        }}
                      />
                      <Button title="Cancel" onPress={resetForm} color="gray" />
                    </>
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={showReminderModal} transparent animationType="fade" onRequestClose={resetForm}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10 }}>
            <Text>{reminderPopup}</Text>
            <Button title="OK" onPress={() => setShowReminderModal(false)} />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default function Index() {
  return <MyCalendar />;
}