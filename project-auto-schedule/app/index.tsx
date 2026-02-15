import React, {useState, useMemo, useCallback} from 'react';
import {Alert, StyleSheet, Text, View, TouchableOpacity, Button} from 'react-native';
import {Calendar, Agenda, DateData, AgendaEntry, AgendaSchedule} from 'react-native-calendars';

// Define a functional component called MyCalendar -- EDIT LATER [currently an example based on a tutorial]
const MyCalendar = () => {
  const initialDate = new Date().toISOString().split('T')[0];
  const [selected, setSelected] = useState(initialDate);

  const onDayPress = (day: DateData) => {
    setSelected(day.dateString);
  };

  const markedDates = {
    [selected]: {
      selected: true,
      selectedColor: '#00adf5',
      selectedTextColor: '#ffffff'
    }
  };

  const [items, setItems] = useState({});

  const addEvent = () => {
    const newItems: AgendaSchedule = {...items};

    if (!newItems[selected]) {
      newItems[selected] = [];
    }

    newItems[selected].push({
      name: `New Event on ${selected}`,
      day: selected,
      height: 70
    });

    setItems(newItems);
  };

  return (
    <View>
      <Calendar
        current={selected}
        onDayPress={onDayPress}
        markedDates={markedDates}
        theme={{
          selectedDayBackgroundColor: '#00adf5',
          todayTextColor: '#00adf5',
          arrowColor: '#00adf5',
          monthTextColor: '#00adf5'          
        }}
      />
      <Button title="Add Event" onPress={addEvent} />
      <Agenda
        items={items}
        selected={selected}
        renderItem={(item) => (
          <View style={{ padding: 10 }}>
            <Text>{item.name}</Text>
          </View>
        )}
        hideKnob={true}
      />
    </View>
  );
};

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <MyCalendar />
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: 'white',
    borderRadius: 5,
    padding: 15,
    margin: 10
  }
});