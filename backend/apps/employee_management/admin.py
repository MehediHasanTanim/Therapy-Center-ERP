from django.contrib import admin

from .infrastructure.models import Employee, EmployeeCompensation, EmployeeDocument


admin.site.register(Employee)
admin.site.register(EmployeeCompensation)
admin.site.register(EmployeeDocument)
