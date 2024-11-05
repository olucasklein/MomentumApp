import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert, Image, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import XLSX from 'xlsx';
import RNFS from 'react-native-fs';

const App = () => {
  const [employeeName, setEmployeeName] = useState('');
  const [checkIns, setCheckIns] = useState({});
  const [selectedDate, setSelectedDate] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());

  const isDuplicateCheckInOrOut = (time, type) => {
    const todayCheckIns = checkIns[selectedDate] || [];
    return todayCheckIns.some(entry => entry.time === time && entry.type === type && entry.name === employeeName);
  };

  const handleCheckIn = async () => {
    if (!employeeName || !selectedDate) {
      Alert.alert("Erro", "Por favor, insira o nome do funcionário e selecione uma data.");
      return;
    }
    
    const formattedTime = selectedTime.toLocaleTimeString();
    
    if (isDuplicateCheckInOrOut(formattedTime, 'check-in')) {
      Alert.alert("Erro", "Já existe um check-in registrado para este horário.");
      return;
    }

    const todayCheckIns = checkIns[selectedDate] || [];
    const newCheckIns = [
      ...todayCheckIns,
      { time: formattedTime, type: 'check-in', name: employeeName }
    ];
    const updatedCheckIns = { ...checkIns, [selectedDate]: newCheckIns };
    setCheckIns(updatedCheckIns);
    await saveData(updatedCheckIns);
  };

  const handleCheckOut = async () => {
    if (!employeeName || !selectedDate) {
      Alert.alert("Erro", "Por favor, insira o nome do funcionário e selecione uma data.");
      return;
    }
    
    const formattedTime = selectedTime.toLocaleTimeString();
    
    if (isDuplicateCheckInOrOut(formattedTime, 'check-out')) {
      Alert.alert("Erro", "Já existe um check-out registrado para este horário.");
      return;
    }

    const todayCheckIns = checkIns[selectedDate] || [];
    const newCheckIns = [
      ...todayCheckIns,
      { time: formattedTime, type: 'check-out', name: employeeName }
    ];
    const updatedCheckIns = { ...checkIns, [selectedDate]: newCheckIns };
    setCheckIns(updatedCheckIns);
    await saveData(updatedCheckIns);
  };

  const removeEntry = async (date, index) => {
    const todayCheckIns = checkIns[date] || [];
    todayCheckIns.splice(index, 1);
    const updatedCheckIns = { ...checkIns, [date]: todayCheckIns.length ? todayCheckIns : undefined };
    setCheckIns(updatedCheckIns);
    await saveData(updatedCheckIns);
  };

  const saveData = async (data) => {
    try {
      await AsyncStorage.setItem('checkIns', JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao salvar os dados:', error);
    }
  };

  const loadData = async () => {
    try {
      const savedData = await AsyncStorage.getItem('checkIns');
      if (savedData) setCheckIns(JSON.parse(savedData));
    } catch (error) {
      console.error('Erro ao carregar os dados:', error);
    }
  };

  const exportDataToExcel = async () => {
    const workSheet = XLSX.utils.json_to_sheet([]);
    for (const date in checkIns) {
      const checkInData = checkIns[date].map(entry => ({
        Date: date,
        Name: entry.name,
        Type: entry.type,
        Time: entry.time,
      }));
      XLSX.utils.sheet_add_json(workSheet, checkInData, { skipHeader: true, origin: -1 });
    }

    const workBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workBook, workSheet, "CheckIns");

    // Salvar o arquivo Excel
    const filePath = `${RNFS.DocumentDirectoryPath}/checkins.xlsx`;
    XLSX.writeFile(workBook, filePath);

    Alert.alert("Exportado!", `Dados exportados para ${filePath}`);
  };

  useEffect(() => {
    loadData();
  }, []);

  const renderItem = ({ item, index }) => (
    <View style={styles.entry}>
      <Text>{`${item.name} - ${item.type === 'check-in' ? 'Check-in' : 'Check-out'}: ${item.time}`}</Text>
      <View style={styles.buttonRemove}>
        <Button title="Remover" onPress={() => removeEntry(selectedDate, index)} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Image source={require('./assets/logo.png')} style={styles.image} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Bater ponto:</Text>
        <View style={styles.exportButtonContainer}>
          <Button title="Exportar Dados" onPress={exportDataToExcel} />
        </View>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Nome do Funcionário"
        value={employeeName}
        onChangeText={setEmployeeName}
      />

      <Text style={styles.mainText}>
        Por favor clique no dia desejado no calendário e selecione o horário
      </Text>

      <Calendar
        onDayPress={(day) => {
          setSelectedDate(day.dateString);
          setShowTimePicker(true); // Abrir modal de seletor de horário
        }}
        markedDates={{
          [selectedDate]: { selected: true, marked: true, dotColor: 'blue' },
        }}
      />

      {/* Mostrar a hora selecionada */}
      <Text style={styles.selectedTimeText}>
        Horário selecionado: {selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>

      <View style={styles.buttonContainer}>
        <View style={styles.buttonCheckIn}>
          <Button title="Check In" onPress={handleCheckIn} />
        </View>
        <View style={styles.buttonSpacer} /> {/* Espaço entre os botões */}
        <View style={styles.buttonCheckOut}>
          <Button title="Check Out" onPress={handleCheckOut} />
        </View>
      </View>

      {/* FlatList com altura fixa para permitir rolagem */}
      <View style={styles.flatListContainer}>
        <FlatList
          data={checkIns[selectedDate] || []}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
        />
      </View>

      {showTimePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(event, date) => {
            setShowTimePicker(false);
            if (date) {
              setSelectedTime(date);
            }
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  image: {
    width: 70,
    height: 70,
    alignSelf: 'center',
    marginBottom: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 15,
    paddingLeft: 8,
  },
  entry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  exportButtonContainer: {
    maxWidth: 150, // Define o máximo de largura aqui
  },
  flatListContainer: {
    maxHeight: 180, // Define a altura máxima da FlatList
    marginTop: 20,
  },
  selectedTimeText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 0,
    marginTop: 15,
  },
  mainText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonSpacer: {
    width: 20,
  },
  buttonCheckIn: {
    width: "40%", 
  },
  buttonCheckOut: {
    width: "40%",
  },
});

export default App;
