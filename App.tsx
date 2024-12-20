import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert, Image, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FileViewer from 'react-native-file-viewer';
import XLSX from 'xlsx';
import RNFS from 'react-native-fs';

const App = () => {
  const [employeeName, setEmployeeName] = useState('');
  const [checkIns, setCheckIns] = useState({});
  const [selectedDate, setSelectedDate] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());

  const handleCheckIn = async () => {
    if (!employeeName || !selectedDate) {
      Alert.alert("Erro", "Por favor, insira o nome do funcionário e selecione uma data.");
      return;
    }
    const formattedTime = selectedTime.toLocaleTimeString();
    const todayCheckIns = checkIns[selectedDate] || [];
    
    // Verificar se o check-in/check-out já existe
    const alreadyCheckedIn = todayCheckIns.some(item => item.time === formattedTime && item.name === employeeName);
    if (alreadyCheckedIn) {
      Alert.alert("Erro", "Já existe um registro de check-in/check-out para este horário.");
      return;
    }

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
    const todayCheckIns = checkIns[selectedDate] || [];
    
    // Verificar se o check-in/check-out já existe
    const alreadyCheckedOut = todayCheckIns.some(item => item.time === formattedTime && item.name === employeeName);
    if (alreadyCheckedOut) {
      Alert.alert("Erro", "Já existe um registro de check-in/check-out para este horário.");
      return;
    }

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

  const exportDataToText = async () => {
    let textData = 'Data, Nome, Tipo, Horário\n'; // Cabeçalho do arquivo de texto
  
    for (const date in checkIns) {
      const checkInData = checkIns[date].map(entry => ({
        Date: date,
        Name: entry.name,
        Type: entry.type === 'check-in' ? 'Check-in' : 'Check-out',
        Time: entry.time,
      }));
  
      // Adiciona as entradas ao texto
      checkInData.forEach(entry => {
        textData += `${entry.Date}, ${entry.Name}, ${entry.Type}, ${entry.Time}\n`;
      });
    }
  
    // Caminho do arquivo de texto
    const filePath = `${RNFS.DocumentDirectoryPath}/checkins.txt`;
  
    // Salva o arquivo de texto
    await RNFS.writeFile(filePath, textData, 'utf8')
      .then(() => {
        Alert.alert(
          "Exportado!",
          `Dados exportados para ${filePath}`,
          [
            {
              text: "Abrir",
              onPress: () => openFile(filePath),
            },
            {
              text: "Fechar",
              style: "cancel"
            }
          ]
        );
      })
      .catch(error => {
        console.error('Erro ao salvar o arquivo de texto:', error);
        Alert.alert("Erro", "Não foi possível salvar o arquivo.");
      });
  };
  
  const openFile = async (filePath) => {
    try {
      await FileViewer.open(filePath, { showOpenWithDialog: true });
    } catch (error) {
      console.error('Erro ao abrir o arquivo:', error);
      Alert.alert("Erro", "Não foi possível abrir o arquivo.");
    }
  };
  
  useEffect(() => {
    loadData();
  }, []);

  const renderItem = ({ item, index }) => (
    <View style={styles.entry}>
      <Text>{`${item.name} - ${item.type === 'check-in' ? 'Check-in' : 'Check-out'}: ${item.time}`}</Text>
      <Button title="Remover" onPress={() => removeEntry(selectedDate, index)} />
    </View>
  );

  return (
    <ScrollView style={styles.container}> {/* ScrollView adicionado aqui */}
      <Image source={require('./assets/logo.png')} style={styles.image} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Bater ponto:</Text>
        <View style={styles.exportButtonContainer}>
          <Button title="Exportar Dados" onPress={exportDataToText} />
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
        <Button title="Check In" onPress={handleCheckIn} />
        <Button title="Check Out" onPress={handleCheckOut} />
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
    </ScrollView>
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
    width: "40%",
  },
  flatListContainer: {
    marginTop: 20,
    marginBottom: 60,
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
    marginVertical: 20,
  },
});

export default App;
