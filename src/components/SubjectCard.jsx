import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { subjectInitials } from './SubjectBadge';

export default function SubjectCard({ name, color = COLORS.primary, onPress }) {
	return (
		<TouchableOpacity style={[styles.card, { backgroundColor: color }]} onPress={onPress}>
			<Text style={styles.initials}>{subjectInitials(name)}</Text>
			<Text style={styles.name}>{name}</Text>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	card: {
		width: '28%',
		aspectRatio: 1,
		borderRadius: 10,
		padding: 12,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 10,
		shadowColor: COLORS.shadow,
		shadowOpacity: 0.12,
		shadowRadius: 6,
	},
	initials: {
		color: COLORS.textWhite,
		fontSize: 18,
		fontWeight: '800',
		letterSpacing: 0.5,
		marginBottom: 8,
	},
	name: {
		color: COLORS.textWhite,
		fontWeight: '500',
		textAlign: 'center',
		fontSize: 10,
	}
});
