import React, {useState, useMemo, useCallback} from 'react';
import {Alert, StyleSheet, Text, View, TouchableOpacity, Button} from 'react-native';
import {Agenda, DateData, AgendaEntry, AgendaSchedule} from 'react-native-calendars';

// Define a functional component called MyCalendar -- EDIT LATER [currently an example based on a tutorial]
const MyCalendar = () => {
  const initialDate = new Date().toISOString().split('T')[0];
  const [selected, setSelected] = useState(initialDate);

  const onDayPress = (day: DateData) => {
    setSelected(day.dateString);
  };

  const markedDates = useMemo(() => ({
    [selected]: {
      selected: true,
      selectedColor: '#00adf5',
      selectedTextColor: '#ffffff'
    }
  }), [selected]);

  const [items, setItems] = useState<Record<string, any[]>>({})

  const addEvent = () => {
    setItems(prevItems => {
      const dayItems = prevItems[selected] || [];

      return {
        ...prevItems,
        [selected]: [
          ...dayItems,
          {
            name: `New Event on ${selected}`,
            day: selected,
            height: 70
          }
        ]
      };
    });
  };

  return (
    <View>
      <Agenda
        items={items}
        selected={selected}
        onDayPress={onDayPress}
        renderItem={(item) => (
          <View style={{ padding: 10 }}>
            <Text>{item.name}</Text>
          </View>
        )}
      />
      <Button title="Add Event" onPress={addEvent} />
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